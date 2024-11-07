import com.structurizr.model.Container
import com.structurizr.model.Relationship
import com.structurizr.model.InteractionStyle
import com.structurizr.model.StaticStructureElement
import com.structurizr.model.Element


val dslParser = context.getDslParser()
val identifiersRegister = dslParser.getIdentifiersRegister()

// parameters
val targetContainer = identifiersRegister.getElement(target) as Container

println("[log] Apply Proxy Server pattern to ${targetContainer} ...")

// create proxy server container in same software system
val targetSoftwareSystem = targetContainer.getSoftwareSystem()
val proxyContainer = targetSoftwareSystem.addContainer("Reverse Proxy")
println("[log] Created proxy server container ${proxyContainer}")

// change destination of incoming relationships
val targetModel = workspace.getModel()

println("[log] Change destination of incoming relationships...")
targetModel.getRelationships().forEach { relationship ->
    if (relationship.getDestination() == targetContainer) {
        println("[log] Change destination for ${relationship} from ${targetContainer} to ${proxyContainer}")

        val method = Relationship::class.java.getDeclaredMethod("setDestination", Element::class.java)
        method.isAccessible = true
        method.invoke(relationship, proxyContainer)
    }
}

// join containers in group
val proxyGroupName = "${targetContainer.getName()} with Reverse Proxy"
targetContainer.setGroup(proxyGroupName)
proxyContainer.setGroup(proxyGroupName)

// add relation ship
val proxyRelationship = proxyContainer.uses(targetContainer, "Resends Requests")
println("[log] Created relationship ${proxyRelationship}")

println("[log] Proxy Server pattern applied")
