export function groupBy(arr, criteria) {
    return arr.reduce(function (acc, currentValue) {
        const group = criteria(currentValue)
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(currentValue);
        return acc;
    }, {});
}

export function getEntityCategory(id){
    // Just split the grounding id and get the first element as the DB normalizer
    let tokens = id.split(":")
    return tokens[0]
}