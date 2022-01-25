import { MathJaxContext, MathJax } from 'better-react-mathjax';

export function generateLatexCode(coefficients){

    const {
		frequency, hasSignificance, avgSignificance, avgImpactFactor, maxImpactFactor, pValue
	}  = coefficients;

    let latex = `\\begin{equation}
                        \\begin{aligned}
                          \\textbf{weight} = &${frequency}\\times\\log(\\text{freq} + 1) + ${hasSignificance} \\times \\text{has significance} + \\\\
                            & ${avgSignificance} \\times \\text{avg significance} +  ${avgImpactFactor} \\times \\text{avg impact factor} + \\\\
                            & ${maxImpactFactor} \\times \\text{max impact factor} +  ${pValue} \\times (1 - \\text{avg p-value}) \\\\
                        \\end{aligned}
                \\end{equation}`

    return latex
}

export default function LatexFormula({ coefficients }){

	const latex = generateLatexCode(coefficients);
	
	return (
		<MathJaxContext>
			<div className="latex-formula"><MathJax dynamic={true}>{ latex }</MathJax></div>
		</MathJaxContext>
	)
}