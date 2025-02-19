package com.patterns;

import java.lang.reflect.Method;

import com.structurizr.dsl.IdentifiersRegister;
import com.structurizr.dsl.StructurizrDslParser;
import com.structurizr.dsl.StructurizrDslPlugin;
import com.structurizr.dsl.StructurizrDslPluginContext;
import com.structurizr.model.Container;
import com.structurizr.model.Element;
import com.structurizr.model.Model;
import com.structurizr.model.Relationship;
import com.structurizr.model.SoftwareSystem;

public class ReverseProxy implements StructurizrDslPlugin {

    @Override
    public void run(StructurizrDslPluginContext context) {
        try {
            StructurizrDslParser dslParser = context.getDslParser();
            IdentifiersRegister identifiersRegister = dslParser.getIdentifiersRegister();

            // parameters
            String target = context.getParameter("target");
            Container targetContainer = (Container) identifiersRegister.getElement(target);

            System.out.println("[log] Apply Proxy Server pattern to " + targetContainer.toString() + " ...");

            // create proxy server container in same software system
            SoftwareSystem targetSoftwareSystem = targetContainer.getSoftwareSystem();
            Container proxyContainer = targetSoftwareSystem.addContainer("Reverse Proxy");
            System.out.println("[log] Created proxy server container " + proxyContainer.toString());

            // change destination of incoming relationships
            Model targetModel = context.getWorkspace().getModel();

            System.out.println("[log] Change destination of incoming relationships...");

            for (Relationship relationship : targetModel.getRelationships()) {
                if (relationship.getDestination() == targetContainer) {
                    System.out.println("[log] Change destination for " + relationship.toString() + " from " + targetContainer.toString() + " to " + proxyContainer.toString());

                    Method method = Relationship.class.getDeclaredMethod("setDestination", Element.class);
                    method.setAccessible(true);
                    method.invoke(relationship, proxyContainer);
                }
            }

            // join containers in group
            String proxyGroupName = targetContainer.getName() + " with Reverse Proxy";
            targetContainer.setGroup(proxyGroupName);
            proxyContainer.setGroup(proxyGroupName);

            // add relation ship
            Relationship proxyRelationship = proxyContainer.uses(targetContainer, "Resends Requests");
            System.out.println("[log] Created relationship " + proxyRelationship.toString());

            System.out.println("[log] Proxy Server pattern applied");
        } catch (Exception e) {
            throw new java.lang.RuntimeException(e.toString());
        }
    }
}
