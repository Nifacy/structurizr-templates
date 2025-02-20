package com.patterns;

import java.util.ArrayList;
import java.util.List;

import com.structurizr.dsl.IdentifiersRegister;
import com.structurizr.dsl.StructurizrDslParser;
import com.structurizr.dsl.StructurizrDslPlugin;
import com.structurizr.dsl.StructurizrDslPluginContext;
import com.structurizr.model.Container;
import com.structurizr.model.Element;
import com.structurizr.view.AutomaticLayout;
import com.structurizr.view.DynamicView;
import com.structurizr.view.ViewSet;

public class Saga extends Pattern implements StructurizrDslPlugin {

    private class SagaItem {

        public Container container;
        public String description;

        public SagaItem(Container container, String description) {
            this.container = container;
            this.description = description;
        }
    }

    @Override
    public void run(StructurizrDslPluginContext context) {
        System.out.println("[log] [saga] Script started");

        StructurizrDslParser dslParser = context.getDslParser();
        IdentifiersRegister identifiersRegister = dslParser.getIdentifiersRegister();

        /* Main */
        String orchestratorId = getRequiredParameter(context, "orchestrator");
        Container orchestratorContainer = (Container) findElement(identifiersRegister, orchestratorId);

        List<SagaItem> transactionSteps = new ArrayList<>();
        List<SagaItem> rollbackSteps = new ArrayList<>();
        int index = 0;

        while (true) {
            String serviceId = context.getParameter("item." + index + ".service");
            if (serviceId == null) {
                break;
            }

            String stepDescription = getRequiredParameter(context, "item." + index + ".command");
            String rollbackStepDescription = getRequiredParameter(context, "item." + index + ".onError");

            System.out.println("[log] [saga] item (" + index + "): service=" + serviceId + ", step=" + stepDescription + ", onError=" + rollbackStepDescription);

            Container itemService = (Container) findElement(identifiersRegister, serviceId);

            if (itemService.getSoftwareSystem() != orchestratorContainer.getSoftwareSystem()) {
                throw new java.lang.RuntimeException("[error] [saga] services '" + orchestratorId + "' and '" + serviceId + "' must be in same software system");
            }

            transactionSteps.add(new SagaItem(itemService, stepDescription));
            rollbackSteps.add(0, new SagaItem(itemService, rollbackStepDescription));

            index++;
        }

        /* Build relationships */
        ViewSet views = context.getWorkspace().getViews();
        DynamicView transactionView = views.createDynamicView(
                orchestratorContainer.getSoftwareSystem(),
                "TransactionView",
                "View of transaction"
        );

        System.out.println("[log] [saga] autolayout set as applied");

        for (SagaItem step : transactionSteps) {
            orchestratorContainer.uses(step.container, step.description);
            transactionView.add(orchestratorContainer, step.description, step.container);
            System.out.println("[log] [saga] relationship '" + step.description + "' added");
        }

        for (SagaItem step : rollbackSteps) {
            orchestratorContainer.uses(step.container, step.description + " on error");
            transactionView.add(orchestratorContainer, step.description + " on error", step.container);
            System.out.println("[log] [saga] relationship '" + step.description + "' added");
        }

        // change implementation on 'Graphvis' instead of 'Dagre'
        transactionView.enableAutomaticLayout(
                AutomaticLayout.RankDirection.LeftRight,
                300,
                500
        );

        System.out.println("[log] [saga] steps amount: " + rollbackSteps.size());
        System.out.println("[log] [saga] Script end");
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
