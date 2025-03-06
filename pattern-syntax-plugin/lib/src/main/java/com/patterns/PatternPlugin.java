package com.patterns;

import com.structurizr.dsl.StructurizrDslPlugin;
import com.structurizr.dsl.StructurizrDslPluginContext;


public class PatternPlugin implements StructurizrDslPlugin {
    @Override
    public void run(StructurizrDslPluginContext context) {
        PatternSyntaxEntity entity = new PatternSyntaxEntity();
        context.getDslParser().addSyntaxEntity(entity);
    }
}
