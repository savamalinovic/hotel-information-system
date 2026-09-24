package org.unibl.etf.blueStars.services.impl;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.unibl.etf.blueStars.exceptions.S3DeletionException;
import org.unibl.etf.blueStars.models.responses.FileUploadResponse;
import org.unibl.etf.blueStars.services.interfaces.S3Service;
import org.unibl.etf.blueStars.util.Constants;
import org.unibl.etf.blueStars.util.FileHelper;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class AwsS3Service implements S3Service {
    @Value("${aws.bucket-name}")
    private String bucketName;

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    public AwsS3Service(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }


    @Override
    public FileUploadResponse uploadFile(String prefix, MultipartFile file) throws IOException {
        String uniqueName = prefix + FileHelper.getUniqueFileName(file.getOriginalFilename());
        try (InputStream is = file.getInputStream()) {
            s3Client.putObject(
                    PutObjectRequest.builder()
                            .bucket(bucketName)
                            .key(uniqueName)
                            .build(),
                    RequestBody.fromInputStream(is, file.getSize())
            );
        }

        return new FileUploadResponse(uniqueName, LocalDateTime.now());
    }

    @Override
    public byte[] downloadFile(String key) throws IOException {
        ResponseBytes<GetObjectResponse> objectAsBytes = s3Client.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucketName)
                .key(Constants.Aws.S3_BUCKET_IMAGES_FOLDER_PREFIX + key)
                .build()
        );

        return objectAsBytes.asByteArray();
    }

    @Override
    public String getPresignedUrl(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(24)) // URL valid for 24 hrs
                .getObjectRequest(getObjectRequest)
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public String deleteFile(String key) throws S3DeletionException {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());

            return key;
        } catch (S3Exception | SdkClientException ex) {
            throw new S3DeletionException("AWS failed to delete file: " + key);
        }
    }
}
