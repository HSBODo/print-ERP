package com.example.app.common.util;

import com.example.app.common.exception.SqlResourceLoadException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class SqlLoader {

    private SqlLoader() {
    }

    public static String load(String classpathLocation) {
        ClassPathResource resource = new ClassPathResource(classpathLocation);
        try (InputStream inputStream = resource.getInputStream()) {
            return StreamUtils.copyToString(inputStream, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new SqlResourceLoadException("SQL resource not found: " + classpathLocation, e);
        }
    }
}
