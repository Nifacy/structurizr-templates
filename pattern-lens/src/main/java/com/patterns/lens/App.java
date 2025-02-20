package com.patterns.lens;

import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

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
            default:
                throw new java.lang.RuntimeException("Unknown command: " + args[0]);
        }
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
