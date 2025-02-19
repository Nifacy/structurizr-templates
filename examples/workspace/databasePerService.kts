import com.structurizr.model.Element
import com.structurizr.model.Container

println("[log] [db per service] Script started")

val dslParser = context.getDslParser()
val identifiersRegister = dslParser.getIdentifiersRegister()

fun findElement(elementId: String): Element {
    val foundElement = identifiersRegister.getElement(elementId)
    if (foundElement == null) {
        throw Exception("[error] [db per service] element with id '${elementId}' not found")
    }

    return foundElement
}

fun getRequiredParameter(name: String): String {
    val value = context.getParameter(name)
    if (value == null) {
        throw Exception("[error] [db per service] parameter '${name}' is required")
    }
    return value
}

/* Main */

val serviceId = getRequiredParameter("service")
val serviceContainer = findElement(serviceId) as Container

val databaseId = getRequiredParameter("database")
val databaseContainer = findElement(databaseId) as Container

val dataDescriptionValue = context.getParameter("dataDescription")
val databaseDescription = if (dataDescriptionValue == null) "data" else dataDescriptionValue

val model = serviceContainer.getModel()

for (relationship in model.getRelationships()) {
    if (relationship.getDestination() == databaseContainer) {
        if (relationship.getSource() != serviceContainer) {
            val sourceName = relationship.getSource().getName()
            val dbName = databaseContainer.getName()
            throw Exception("[error] [db per service] Database '${dbName}' is already used by '${sourceName}'")
        }
    }
}

// Add relationship
serviceContainer.uses(databaseContainer, "Reads & writes ${dataDescription}")

// Add in group
val groupName = "${serviceContainer.getName()} with database"
serviceContainer.setGroup(groupName)
databaseContainer.setGroup(groupName)
