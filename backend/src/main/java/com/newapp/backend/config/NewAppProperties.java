package com.newapp.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Mappe les propriétés "newapp.*" de application.yaml vers des objets Java.
 */
@Component
@ConfigurationProperties(prefix = "newapp")
public class NewAppProperties {

    /** Code unique d'accès au BackOffice (étape 1.a). */
    private String backofficeCode = "admin";

    private Storage storage = new Storage();

    public String getBackofficeCode() {
        return backofficeCode;
    }

    public void setBackofficeCode(String backofficeCode) {
        this.backofficeCode = backofficeCode;
    }

    public Storage getStorage() {
        return storage;
    }

    public void setStorage(Storage storage) {
        this.storage = storage;
    }

    public static class Storage {
        /** Dossier où seront extraites les images du ZIP (étape import). */
        private String imagesDir = "../data/storage/images";

        public String getImagesDir() {
            return imagesDir;
        }

        public void setImagesDir(String imagesDir) {
            this.imagesDir = imagesDir;
        }
    }
}

