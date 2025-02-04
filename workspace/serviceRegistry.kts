import com.structurizr.model.Container
import com.structurizr.model.Element

data class RegistryQuery(
    val sourceId: String,
    val destinationId: String
)

println("[log] [service registry] Script started")

val dslParser = context.getDslParser()
val identifiersRegister = dslParser.getIdentifiersRegister()

fun findElement(elementId: String): Element {
    val foundElement = identifiersRegister.getElement(elementId)
    if (foundElement == null) {
        throw Exception("[error] [service registry] element with id '${elementId}' not found")
    }

    return foundElement
}

/* Parse Parameters */

val registryId = context.getParameter("registry")
if (registryId == null) {
    throw Exception("Parameter 'registry' expected")
}

val connectedServicesIds = context.getParameter("connectedServices")
if (connectedServicesIds == null) {
    throw Exception("Parameter 'connectedServices' expected")
}

val queries = mutableListOf<RegistryQuery>()
var index = 0

while (true) {
    val sourceId = context.getParameter("query.${index}.source")
    if (sourceId == null) break

    val destinationId = context.getParameter("query.${index}.destination")
    if (destinationId == null) {
        throw Exception("Parameter 'query.${index}.destination' expected")
    }

    queries.add(RegistryQuery(sourceId=sourceId, destinationId=destinationId))

    index++
}

/* Find Elements */

val _connectedServices = mutableMapOf<String, Container>()
val _registryService = findElement(registryId) as Container

for (connectedServiceId in connectedServicesIds.split(",")) {
    val connectedService = findElement(connectedServiceId) as Container
    if (_connectedServices.containsKey(connectedServiceId)) {
        throw Exception("Id '${connectedServiceId}' is not unique")
    }

    _connectedServices[connectedServiceId] = connectedService
}

/* Add Relationships */

for (query in queries) {
    val sourceService = findElement(query.sourceId) as Container

    val destinationService = _connectedServices[query.destinationId]
    if (destinationService == null) {
        throw Exception("Element with id '${query.destinationId}' not found")
    }

    sourceService.uses(_registryService, "Requests location of ${destinationService.getName()}")
}

for (connectedService in _connectedServices.values) {
    connectedService.uses(_registryService, "Registers itself in registry")
}

/* Print parsed data */

println("[log] [service registry] Connected services: ${_connectedServices}")

println("[log] [service registry] Script ended")
