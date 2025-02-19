import com.structurizr.model.Element
import com.structurizr.model.Container
import com.structurizr.view.AutomaticLayout

data class SagaItem(
    val container: Container,
    val description: String
)

println("[log] [saga] Script started")

val dslParser = context.getDslParser()
val identifiersRegister = dslParser.getIdentifiersRegister()

fun findElement(elementId: String): Element {
    val foundElement = identifiersRegister.getElement(elementId)
    if (foundElement == null) {
        throw Exception("[error] [saga] element with id '${elementId}' not found")
    }

    return foundElement
}

fun getRequiredParameter(name: String): String {
    val value = context.getParameter(name)
    if (value == null) {
        throw Exception("[error] [saga] parameter '${name}' is required")
    }
    return value
}

/* Main */

val orchestratorId = getRequiredParameter("orchestrator")
val orchestratorContainer = findElement(orchestratorId) as Container

val transactionSteps = mutableListOf<SagaItem>()
val rollbackSteps = mutableListOf<SagaItem>()
var index = 0

while (true) {
    val serviceId = context.getParameter("item.${index}.service")
    if (serviceId == null) break

    val stepDescription = getRequiredParameter("item.${index}.command")
    val rollbackStepDescription = getRequiredParameter("item.${index}.onError")

    println("[log] [saga] item (${index}): service=${serviceId}, step=${stepDescription}, onError=${rollbackStepDescription}")

    val itemService = findElement(serviceId) as Container

    if (itemService.getSoftwareSystem() != orchestratorContainer.getSoftwareSystem()) {
        throw Exception("[error] [saga] services '${orchestratorId}' and '${serviceId}' must be in same software system")
    }

    transactionSteps.add(SagaItem(
        container=itemService,
        description=stepDescription
    ))

    rollbackSteps.add(0, SagaItem(
        container=itemService,
        description=rollbackStepDescription
    ))

    index++
}

/* Build relationships */

val views = workspace.getViews()
val transactionView = views.createDynamicView(orchestratorContainer.getSoftwareSystem(), "TransactionView", "View of transaction")

println("[log] [saga] autolayout set as applied")

for (step in transactionSteps) {
    orchestratorContainer.uses(step.container, step.description)
    transactionView.add(orchestratorContainer, step.description, step.container)
    println("[log] [saga] relationship '${step.description}' added")
}

for (step in rollbackSteps) {
    orchestratorContainer.uses(step.container, "${step.description} on error")
    transactionView.add(orchestratorContainer, "${step.description} on error", step.container)
    println("[log] [saga] relationship '${step.description}' added")
}

// change implementation on 'Graphvis' instead of 'Dagre'
transactionView.enableAutomaticLayout(
    AutomaticLayout.RankDirection.LeftRight,
    300,
    500
)
// transactionView.getAutomaticLayout().setApplied(true)

println("[log] [saga] steps amount: ${rollbackSteps.size}")
println("[log] [saga] Script end")
