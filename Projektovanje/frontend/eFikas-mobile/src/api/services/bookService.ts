import { fileService } from "@/src/services/fileService";
import { GuestBookType } from "@/src/types/enums";
import { CreateIncomeBookRequest, DownloadIncomeBookRequest, GuestsBookRequest, PdfResult } from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";
import { Platform } from "react-native";
import ReactNativeBlobUtil, { FetchBlobResponse } from "react-native-blob-util";


import { File, Directory, Paths } from 'expo-file-system';
import { AxiosError, AxiosResponse } from "axios";
import axiosInstance from "../axiosInstance";
import { sessionStore } from "@/src/session/sessionStore";

type BlobFetchOptions = {
	downloadPath?: string; // full file path INCLUDING filename
	description?: string;
};

// This function "streams" the data into a temporary path
const getStreamUri = async (url, token) => {
	const res = await ReactNativeBlobUtil.config({
		fileCache: true, // Saves to a temp file automatically
		appendExt: 'pdf'
	}).fetch('GET', url, {
		Authorization: `Bearer ${token}`,
	});

	const status = res.info().status;

	if (status === 400) {
		throw new AxiosError('Invalid request parameters (400).', '400');
	}
	if (status === 204) {
		throw new AxiosError('No data found for the selected period (204).', '204');
	}
	if (status >= 400) {
		throw new AxiosError(`Server responded with status ${status}`, status.toString());
	}

	// This path is temporary and will be cleared by the OS eventually
	return res.path();
};

export const fetchPdfHelper = async (
	url: string,
	options?: BlobFetchOptions
): Promise<PdfResult> => {
	let file: File;

	if (options?.downloadPath) {
		file = new File(options.downloadPath);
	}
	else {
		const dir = new Directory(Paths.cache, 'books');
		fileService.ensureDirectory(dir);

		file = new File(dir, `Book_${Date.now()}.pdf`);
	}

	// Ensure parent directory exists
	//await new Directory(file.parentDirectory).create({ intermediates: true });
	const token = sessionStore.getToken();
	if (!token) {
		throw new Error("Authentication is required.");
	}

    const result = await File.downloadFileAsync(url, file, {
        headers: {
            'Accept': 'application/pdf',
            'Authorization': `Bearer ${token}`, // <--- Add this line!
        },
        idempotent: true,
    });

	if(result.size === 0) {
		fileService.deleteFile(file.uri); // Clean up the empty file
		throw new AxiosError('Downloaded file is empty.', '204');
	}

	if (!result.exists) {
		throw new Error('PDF download failed');
	}

	return { uri: result.uri };
};

const buildGuestsBookUrl = (type: GuestBookType, { active, period }: GuestsBookRequest) => {
	const base =
		type === GuestBookType.DOMESTIC_GUESTS
			? API_URLS.books.getDomesticGuestsBookPdf
			: API_URLS.books.getForeignGuestsBookPdf;

	return `${base}?active=${active}&from=${period.from}&to=${period.to}`;
};

const buildIncomeBookUrl = ({ taxpayerId, period }: DownloadIncomeBookRequest) =>
	`${API_URLS.books.getIncomeBookPdf}?taxpayerId=${taxpayerId}&from=${period.from}&to=${period.to}`;

export const bookService = {
	/* ==================================== STREAMING BOOKS ==================================== */
	addIncome: async (request: CreateIncomeBookRequest): Promise<AxiosResponse> => {
		const response = await axiosInstance.post(API_URLS.books.addIncome, request);
		return response;
	},


	/* ==================================== STREAMING BOOKS ==================================== */
	streamIncomeBook: async (request: DownloadIncomeBookRequest): Promise<PdfResult> => {
		const url = buildIncomeBookUrl(request);
		const token = sessionStore.getToken();
		if (!token) {
			throw new Error("Authentication is required.");
		}

		const uriResult = await getStreamUri(url, token);

		return { uri: uriResult };
	},

	streamGuestsBook: async (type: GuestBookType, request: GuestsBookRequest): Promise<PdfResult> => {
		// const url = buildGuestsBookUrl(type, request);

		// return fetchPdfHelper(url);

		const url = buildGuestsBookUrl(type, request);
		const token = sessionStore.getToken();
		if (!token) {
			throw new Error("Authentication is required.");
		}

		const uriResult = await getStreamUri(url, token);

		return { uri: uriResult };
	},


	/* ==================================== DOWNLOADING BOOKS ==================================== */
	downloadIncomeBook: async (downloadPath: string, request: DownloadIncomeBookRequest): Promise<PdfResult> => {
		const url = buildIncomeBookUrl(request);
		const description = 'Downloading Income Book PDF';

		return fetchPdfHelper(url, { downloadPath, description: description });
	},

	downloadGuestsBook: async (downloadPath: string, type: GuestBookType, request: GuestsBookRequest): Promise<PdfResult> => {
		const url = buildGuestsBookUrl(type, request);
		const description = 'Downloading Guests Book PDF';

		return fetchPdfHelper(url, { downloadPath, description: description });
	},
}
