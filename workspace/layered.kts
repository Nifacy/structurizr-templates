import com.structurizr.model.Container
import com.structurizr.model.Element

data class LayerGroup(
    val name: String,
    val elements: List<Container>
)

fun getLayerIdByElements(layers: List<LayerGroup>, element: Element): Int {
    for (index in layers.indices) {
        val layer = layers[index]

        for (layerElement in layer.elements) {
            if (layerElement == element) {
                return index
            }
        }
    }

    return -1 // expected Unit but got int
}

fun validateElementsAreUnique(layers: List<LayerGroup>) {
    val elementsMap = mutableMapOf<Container, Int>()

    for (index in layers.indices) {
        val layer = layers[index]

        for (element in layer.elements) {
            if (elementsMap.containsKey(element)) {
                throw Exception("Element '${element}' exists in both layers: ${elementsMap[element]} and ${index}.")
            }

            elementsMap[element] = index
        }
    }
}

println("[log] [layered] Script started")

val dslParser = context.getDslParser()
val identifiersRegister = dslParser.getIdentifiersRegister()

var index = 0
val layerGroups = mutableListOf<LayerGroup>()

// build list of groups
while (true) {
    val layerName = context.getParameter("layer.$index.name")
    if (layerName == null) {
        break
    }

    val layerElementIds = context.getParameter("layer.$index.elements")
    if (layerElementIds == null) {
        throw Exception("Parameter layer.${index}.elements expected")
    }

    val layerElements = layerElementIds.split(",").map { containerName ->
        identifiersRegister.getElement(containerName) as Container
    }

    layerGroups.add(LayerGroup(name = layerName, elements = layerElements))

    println("[log] [layered] Layer $index:")
    println("[log] [layered]     - name: $layerName")
    println("[log] [layered]     - elements: $layerElements")

    index++
}

// validate elements are unique

validateElementsAreUnique(layerGroups)

// validate elements relationships

for (i in layerGroups.indices) {
    val currentGroup = layerGroups[i]

    for (element in currentGroup.elements) {
        for (relationship in element.getRelationships()) {
            val relatedElement = relationship.getDestination()
            val layerIndex = getLayerIdByElements(layerGroups, relatedElement)

            if (layerIndex == i || layerIndex == i + 1 || layerIndex == -1) {
                continue
            }

            throw Exception("Invalid relationship ${element} (layer ${i}) -> ${relatedElement} (layer ${layerIndex})")
        }
    }
}

// group elements of layers

for (group in layerGroups) {
    for (element in group.elements) {
        element.setGroup(group.name)
    }
}

println("[log] [layered] Script end")
