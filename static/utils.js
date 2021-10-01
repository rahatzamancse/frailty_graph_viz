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