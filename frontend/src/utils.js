function arizona_weight(d){

    const freq_w = readSliderValue("freq")
    const has_sig_w = readSliderValue("has-sig")
    const avg_sig_w = readSliderValue("avg-sig")
    const avg_impact_w = readSliderValue("avg-impact")
    const max_impact_w = readSliderValue("max-impact")
    const avg_pval_w = readSliderValue("avg-pvalue")

    return  freq_w * Math.log((d['freq'] + 1)) +
        has_sig_w * ('has_significance' in d ? +d['has_significance'] : 0.) +
        avg_sig_w * Math.pow('percentage_significance' in d ? 2*d['percentage_significance'] : 0., 2) +
        avg_impact_w * d['avg_impact'] +
        max_impact_w * Math.log(d['max_impact'] + 1) +
        avg_pval_w * (1-d['avg_pvalue'])
}

function arizona_weight_latex(){
    const freq_w = readSliderValue("freq")
    const has_sig_w = readSliderValue("has-sig")
    const avg_sig_w = readSliderValue("avg-sig")
    const avg_impact_w = readSliderValue("avg-impact")
    const max_impact_w = readSliderValue("max-impact")
    const avg_pval_w = readSliderValue("avg-pvalue")

    let latex = `\\begin{equation}
                        \\begin{aligned}
                          \\textbf{weight} = &${freq_w}\\times\\log(\\text{freq} + 1) + ${has_sig_w} \\times \\text{has significance} + \\\\
                            & ${avg_sig_w} \\times \\text{avg significance} +  ${avg_impact_w} \\times \\text{avg impact factor} + \\\\
                            & ${max_impact_w} \\times \\text{max impact factor} +  ${avg_pval_w} \\times (1 - \\text{avg p-value}) \\\\
                        \\end{aligned}
                \\end{equation}`

    return latex
}

function readSliderValue(name){

    const localStorage = window.localStorage
    const weight = localStorage.getItem(`${name}-weight`)
    if(!weight)
        return 1.
    else
        return weight
}

function setSliderValue(name, val){
    const localStorage = window.localStorage
    localStorage.setItem(`${name}-weight`, val)
}

function renderFormula(){
    let formulaContainer = document.getElementById("formula")
    formulaContainer.innerText = arizona_weight_latex()
    MathJax.typeset()
}

function getEntityCategory(id){
    // Just split the grounding id and get the first element as the DB normalizer
    let tokens = id.split(":")
    return tokens[0]
}

function groupBy(arr, criteria) {
    return arr.reduce(function (acc, currentValue) {
        const group = criteria(currentValue)
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(currentValue);
        return acc;
    }, {});
}



// Point/Vector Operations

export const vecFrom = function (p0, p1) {               // Vector from p0 to p1
    return [p1[0] - p0[0], p1[1] - p0[1]];
}

export const vecScale = function (v, scale) {            // Vector v scaled by 'scale'
    return [scale * v[0], scale * v[1]];
}

export const vecSum = function (pv1, pv2) {              // The sum of two points/vectors
    return [pv1[0] + pv2[0], pv1[1] + pv2[1]];
}

export const vecUnit = function (v) {                    // Vector with direction of v and length 1
    const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
    return vecScale(v, 1 / norm);
}

export const vecScaleTo = function (v, length) {         // Vector with direction of v with specified length
    return vecScale(vecUnit(v), length);
}

export const unitNormal = function (pv0, p1) {           // Unit normal to vector pv0, or line segment from p0 to p1
    if (p1 != null) pv0 = vecFrom(pv0, p1);
    const normalVec = [-pv0[1], pv0[0]];
    return vecUnit(normalVec);
};