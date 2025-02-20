package com.patterns;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import com.structurizr.dsl.IdentifiersRegister;
import com.structurizr.dsl.StructurizrDslParser;
import com.structurizr.dsl.StructurizrDslPlugin;
import com.structurizr.dsl.StructurizrDslPluginContext;
import com.structurizr.model.Container;
import com.structurizr.model.Element;

public class ServiceRegistry extends Pattern implements StructurizrDslPlugin {

    private class RegistryQuery {

        public String sourceId;
        public String destinationId;

        public RegistryQuery(String sourceId, String destinationId) {
            this.sourceId = sourceId;
            this.destinationId = destinationId;
        }
    }

    @Override
    public void run(StructurizrDslPluginContext context) {
        System.out.println("[log] [service registry] Script started");

        StructurizrDslParser dslParser = context.getDslParser();
        IdentifiersRegister identifiersRegister = dslParser.getIdentifiersRegister();

        /* Parse Parameters */
        String registryId = getRequiredParameter(context, "registry");
        String connectedServicesIds = getRequiredParameter(context, "connectedServices");

        List<RegistryQuery> queries = new ArrayList<>();
        int index = 0;

        while (true) {
            String sourceId = context.getParameter("query." + index + ".source");
            if (sourceId == null) {
                break;
            }

            String destinationId = getRequiredParameter(context, "query." + index + ".destination");
            queries.add(new RegistryQuery(sourceId, destinationId));

            index++;
        }

        /* Find Elements */
        HashMap<String, Container> _connectedServices = new HashMap<>();
        Container _registryService = (Container) findElement(identifiersRegister, registryId);

        for (String connectedServiceId : connectedServicesIds.split(",")) {
            Container connectedService = (Container) findElement(identifiersRegister, connectedServiceId);
            if (_connectedServices.containsKey(connectedServiceId)) {
                throw new java.lang.RuntimeException("Id '" + connectedServiceId + "' is not unique");
            }

            _connectedServices.put(connectedServiceId, connectedService);
        }

        /* Add Relationships */
        for (RegistryQuery query : queries) {
            Container sourceService = (Container) findElement(identifiersRegister, query.sourceId);

            Container destinationService = _connectedServices.get(query.destinationId);
            if (destinationService == null) {
                throw new java.lang.RuntimeException("Element with id '" + query.destinationId + "' not found");
            }

            sourceService.uses(
                    _registryService,
                    "Requests location of ${destinationService.getName()}"
            );
        }

        for (Container connectedService : _connectedServices.values()) {
            connectedService.uses(_registryService, "Registers itself in registry");
        }

        /* Print parsed data */
        System.out.println("[log] [service registry] Connected services: " + _connectedServices);
        System.out.println("[log] [service registry] Script ended");
    }

    private Element findElement(IdentifiersRegister identifiersRegister, String elementId) {
        Element foundElement = identifiersRegister.getElement(elementId);
        if (foundElement == null) {
            throw new java.lang.RuntimeException("[error] [db per service] element with id '" + elementId + "' not found");
        }
        return foundElement;
    }

    private String getRequiredParameter(StructurizrDslPluginContext context, String name) {
        String value = context.getParameter(name);
        if (value == null) {
            throw new java.lang.RuntimeException("[error] [db per service] parameter '" + name + "' is required");
        }
        return value;
    }

}
