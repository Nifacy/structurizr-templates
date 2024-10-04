package com.project;

import java.io.File;

import com.structurizr.dsl.StructurizrDslParser;
import com.structurizr.model.Model;

public class App {
    public static void main(String[] args) {
        if (args.length > 0) {
            String filePath = args[0];
            File dslFile = new File(filePath);

            if (dslFile.exists()) {
                try {
                    // DSL file parsing
                    StructurizrDslParser parser = new StructurizrDslParser();
                    parser.parse(dslFile);

                    // getting model and view
                    Model model = parser.getWorkspace().getModel();

                    System.out.println("Model loaded.");
                    System.out.println("Elements amount: " + model.getElements().size());
                    System.out.println("Relationships amount: " + model.getRelationships().size());
                } catch (Exception e) {
                    System.err.println("Parse error: " + e.getMessage());
                }
            } else {
                System.err.println("File not found: " + filePath);
            }
        } else {
            System.out.println("Please, specify path to Structurizr DSL file.");
        }
    }
}
