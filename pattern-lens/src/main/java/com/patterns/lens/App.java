package com.patterns.lens;

import java.io.File;
import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.json.JSONArray;

import com.patterns.lens.fields.FieldParser;
import com.patterns.lens.fields.SchemaField;

public class App {
    public static void main(String[] args) {
        try {
            handleQuery(args);
        } catch (Exception e) {
            System.err.println("[error] " + e.getMessage());
            System.exit(1);
        }
    }

    private static void handleQuery(String[] args) throws MalformedURLException {
        switch (args[0]) {
            case "is-pattern":
                boolean result = checkIsPattern(args[1], args[2]);
                System.out.println(result);
                break;
            case "get-params":
                JSONArray params = getPatternParams(args[1], args[2]);
                System.out.println(params.toString(4));
                break;
            default:
                throw new java.lang.RuntimeException("Unknown command: " + args[0]);
        }
    }

    private static JSONArray getPatternParams(String workspacePath, String pluginName) throws MalformedURLException {
        if (!checkIsPattern(workspacePath, pluginName)) {
            throw new java.lang.RuntimeException(pluginName + " is not a pattern");
        }

        String pluginsDirPath = Paths.get(workspacePath).getParent().resolve("plugins").toString();
        ClassLoader loader = initLoader(pluginsDirPath);

        Optional<Class> maybeSchemaTagClass = tryLoadClass(loader, "com.patterns.params.Schema");
        if (!maybeSchemaTagClass.isPresent()) {
            throw new java.lang.RuntimeException("Broken patterns library: Unable to load schema base interface");
        }
        Class<?> schemaTagClass = maybeSchemaTagClass.get();
        Class<?> targetPluginClass = tryLoadClass(loader, pluginName).get();

        ParameterizedType superclass = (ParameterizedType) targetPluginClass.getGenericSuperclass();
        Type schemaType = superclass.getActualTypeArguments()[0];

        List<SchemaField> fields = new FieldParser(schemaTagClass).fromSchema(schemaType);
        return new FieldSerializer().serialize(fields);
    }

    private static boolean checkIsPattern(String workspacePath, String pluginName) throws MalformedURLException {
        String pluginsDirPath = Paths.get(workspacePath).getParent().resolve("plugins").toString();
        ClassLoader loader = initLoader(pluginsDirPath);

        Optional<Class> basePatternClass = tryLoadClass(loader, "com.patterns.Pattern");
        if (!basePatternClass.isPresent()) {
            System.err.println("[warn] current workspace doesn't support patterns");
            return false;
        }

        Optional<Class> targetPluginClass = tryLoadClass(loader, pluginName);
        if (!targetPluginClass.isPresent()) {
            throw new java.lang.RuntimeException("Unknown plugin '" + pluginName + "'");
        }

        return basePatternClass.get().isAssignableFrom(targetPluginClass.get());
    }

    private static Optional<Class> tryLoadClass(ClassLoader loader, String className) {
        try {
            return Optional.of(loader.loadClass(className));
        } catch(ClassNotFoundException e) {
            return Optional.empty();
        }
    }

    private static URLClassLoader initLoader(String pluginsDirectory) {
        System.err.println("[log] load jars from '" + pluginsDirectory + "' ...");

        File jarDirectory = new File(pluginsDirectory);
        if (!jarDirectory.isDirectory()) {
            throw new java.lang.RuntimeException("'" + jarDirectory + "' is not a directory");
        }

        List<URL> jarUrls = new ArrayList<>();
        for (File file : jarDirectory.listFiles()) {
            if (file.getName().endsWith(".jar")) {
                try {
                    URL fileUrl = file.toURI().toURL();
                    jarUrls.add(fileUrl);
                    System.err.println("[log] add jar '" + file.getPath() + "' ...");
                } catch (MalformedURLException e) {
                    throw new Error(e.toString());
                }
            }
        }

        System.err.println("[log] initialize loader ...");
        return new URLClassLoader(jarUrls.toArray(new URL[0]));        
    }
}
