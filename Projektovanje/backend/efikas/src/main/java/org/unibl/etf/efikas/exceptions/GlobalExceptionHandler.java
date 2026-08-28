package org.unibl.etf.efikas.exceptions;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.convert.ConversionFailedException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;
import org.unibl.etf.efikas.models.responses.errors.ApiErrorCode;
import org.unibl.etf.efikas.models.responses.errors.ApiErrorResponse;
import org.unibl.etf.efikas.models.responses.errors.ApiFieldViolation;
import software.amazon.awssdk.services.ses.model.MessageRejectedException;

import java.util.Comparator;
import java.util.List;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleBodyValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        List<ApiFieldViolation> violations = ex.getBindingResult().getAllErrors().stream()
                .map(error -> new ApiFieldViolation(
                        error instanceof FieldError fieldError ? fieldError.getField() : error.getObjectName(),
                        messageOrDefault(error.getDefaultMessage())))
                .sorted(Comparator.comparing(ApiFieldViolation::field).thenComparing(ApiFieldViolation::message))
                .toList();

        return validationResponse(request, violations);
    }

    @ExceptionHandler(HandlerMethodValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodValidation(
            HandlerMethodValidationException ex,
            HttpServletRequest request
    ) {
        List<ApiFieldViolation> violations = ex.getAllValidationResults().stream()
                .flatMap(result -> result.getResolvableErrors().stream().map(error -> new ApiFieldViolation(
                        error instanceof FieldError fieldError
                                ? fieldError.getField()
                                : result.getMethodParameter().getParameterName(),
                        messageOrDefault(error.getDefaultMessage()))))
                .sorted(Comparator.comparing(ApiFieldViolation::field).thenComparing(ApiFieldViolation::message))
                .toList();

        return validationResponse(request, violations);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintValidation(
            ConstraintViolationException ex,
            HttpServletRequest request
    ) {
        List<ApiFieldViolation> violations = ex.getConstraintViolations().stream()
                .map(violation -> new ApiFieldViolation(
                        violation.getPropertyPath().toString(),
                        messageOrDefault(violation.getMessage())))
                .sorted(Comparator.comparing(ApiFieldViolation::field).thenComparing(ApiFieldViolation::message))
                .toList();

        return validationResponse(request, violations);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            ConversionFailedException.class})
    public ResponseEntity<ApiErrorResponse> handleMalformedRequest(
            Exception ex,
            HttpServletRequest request
    ) {
        return response(
                HttpStatus.BAD_REQUEST,
                ApiErrorCode.MALFORMED_REQUEST,
                "The request body or parameter format is invalid.",
                request);
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(
            EntityNotFoundException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.NOT_FOUND, ApiErrorCode.RESOURCE_NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(DomainConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleDomainConflict(
            DomainConflictException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.CONFLICT, ApiErrorCode.RESOURCE_CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            HttpServletRequest request
    ) {
        return response(
                HttpStatus.CONFLICT,
                ApiErrorCode.DATA_INTEGRITY_CONFLICT,
                "The request conflicts with existing data.",
                request);
    }

    @ExceptionHandler({DuplicatePushTokenException.class, StoreExistsException.class})
    public ResponseEntity<ApiErrorResponse> handleExistingResource(
            RuntimeException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.CONFLICT, ApiErrorCode.RESOURCE_CONFLICT, ex.getMessage(), request);
    }

    @ExceptionHandler({InvalidBookPeriodException.class, IllegalArgumentException.class,
            MessageRejectedException.class})
    public ResponseEntity<ApiErrorResponse> handleBusinessRule(
            RuntimeException ex,
            HttpServletRequest request
    ) {
        String message = ex instanceof MessageRejectedException
                ? "This email address is not verified."
                : ex.getMessage();
        return response(HttpStatus.BAD_REQUEST, ApiErrorCode.BUSINESS_RULE_VIOLATION, message, request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleUploadTooLarge(
            MaxUploadSizeExceededException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.PAYLOAD_TOO_LARGE, ApiErrorCode.BUSINESS_RULE_VIOLATION,
                "Attachment must not exceed 10 MB.", request);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.UNAUTHORIZED, ApiErrorCode.INVALID_CREDENTIALS, ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(
            AccessDeniedException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.FORBIDDEN, ApiErrorCode.ACCESS_DENIED, "Access is denied.", request);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(
            ResponseStatusException ex,
            HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        ApiErrorCode code = switch (status) {
            case NOT_FOUND -> ApiErrorCode.RESOURCE_NOT_FOUND;
            case CONFLICT -> ApiErrorCode.RESOURCE_CONFLICT;
            case UNAUTHORIZED -> ApiErrorCode.INVALID_CREDENTIALS;
            case FORBIDDEN -> ApiErrorCode.ACCESS_DENIED;
            case BAD_REQUEST, UNPROCESSABLE_ENTITY -> ApiErrorCode.BUSINESS_RULE_VIOLATION;
            default -> ApiErrorCode.INTERNAL_ERROR;
        };
        String message = ex.getReason() == null ? "The request could not be completed." : ex.getReason();
        return response(status, code, message, request);
    }

    @ExceptionHandler(NoRelevantGuestsException.class)
    public ResponseEntity<ApiErrorResponse> handleNoRelevantGuests(
            NoRelevantGuestsException ex,
            HttpServletRequest request
    ) {
        return response(HttpStatus.NOT_FOUND, ApiErrorCode.RESOURCE_NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler({S3UploadException.class, S3DeletionException.class})
    public ResponseEntity<ApiErrorResponse> handleUpstreamFailure(
            RuntimeException ex,
            HttpServletRequest request
    ) {
        return response(
                HttpStatus.BAD_GATEWAY,
                ApiErrorCode.UPSTREAM_SERVICE_ERROR,
                "The storage service could not complete the request.",
                request);
    }

    @ExceptionHandler(BookPdfGenerationException.class)
    public ResponseEntity<ApiErrorResponse> handlePdfFailure(
            BookPdfGenerationException ex,
            HttpServletRequest request
    ) {
        log.error("PDF generation failed", ex);
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ApiErrorCode.INTERNAL_ERROR,
                "The document could not be generated.",
                request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(
            Exception ex,
            HttpServletRequest request
    ) {
        log.error("Unhandled request failure for {}", request.getRequestURI(), ex);
        return response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ApiErrorCode.INTERNAL_ERROR,
                "An unexpected error occurred.",
                request);
    }

    private ResponseEntity<ApiErrorResponse> validationResponse(
            HttpServletRequest request,
            List<ApiFieldViolation> violations
    ) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        return ResponseEntity.status(status).body(ApiErrorResponse.validation(
                status.value(),
                "One or more request fields are invalid.",
                request.getRequestURI(),
                violations));
    }

    private ResponseEntity<ApiErrorResponse> response(
            HttpStatus status,
            ApiErrorCode code,
            String message,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(status).body(ApiErrorResponse.of(
                status.value(), code, messageOrDefault(message), request.getRequestURI()));
    }

    private static String messageOrDefault(String message) {
        return message == null || message.isBlank() ? "The request could not be completed." : message;
    }
}
