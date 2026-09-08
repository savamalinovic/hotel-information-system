package org.unibl.etf.blueStars.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import org.unibl.etf.blueStars.exceptions.S3UploadException;
import org.unibl.etf.blueStars.models.responses.FileUploadResponse;
import org.unibl.etf.blueStars.services.interfaces.S3Service;
import org.unibl.etf.blueStars.util.Constants;
import org.unibl.etf.blueStars.configs.OpenApiConfig;

import java.io.IOException;
import java.net.URI;
import java.util.Map;

// REST controller for testing AWS S3 API. Can be changed further down the line (or deleted) when the url gets embedded in appropriate models.
@RestController
@RequestMapping("/api/v1/s3")
@Tag(name = "Storage")
@SecurityRequirement(name = OpenApiConfig.BEARER_AUTH)
public class S3Controller {

    private final S3Service s3Service;

    public S3Controller(S3Service s3Service) {
        this.s3Service = s3Service;
    }

    @GetMapping("/url")
    public ResponseEntity<?> getPresignedUrl(@RequestBody Map<String, String> body) {
        String key = body.get("key");
        return ResponseEntity.ok(Map.of("url", s3Service.getPresignedUrl(key)));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("image") MultipartFile file) {
        FileUploadResponse fileUploadResponse = null;
        try {
            fileUploadResponse = s3Service.uploadFile(Constants.Aws.S3_BUCKET_IMAGES_FOLDER_PREFIX, file);
        } catch (IOException e) {
            throw new S3UploadException(e.getMessage());
        }

        URI location = ServletUriComponentsBuilder
                .fromCurrentRequest()
                .path("/{filePath}")
                .buildAndExpand(fileUploadResponse.getFilePath())
                .toUri();

        return ResponseEntity.created(location).body(fileUploadResponse);
    }
}
