# Weighting schema for viz edges

Every edge in the visualization represents an aggregation of different extractions that share participants as their endpoints and share polarity, i.e. All positive interactions between A and B, al negative interactions between B and C, etc.

To weight each edge, we compute a linear combination of the following variables.

# Variables

- _Frequency_: Integer variable. Count of how many times an interaction among the endpoints with the specified polarity was observed
- _Venue impact factor distribution_: Real valued variables. Average, minimum and maximum impact factor of the journals where the interaction was observed
- _Presence of statistical significance_: 1/0 variable. Takes value of `1` if at least one of the documents where the interaction is observed reports statistical significance results.
  
- _Percentage of presence of statistical significance_: `[0, 1]` variable. Example: if the interaction appears in fifty papers and 10 of those report statistical significance figures, this variable takes a value of `0.2` 

# Normalization options
Consider that _frequency_ has a range of several orders of magnitude higher than the rest of the variables. For example, we observe interactions with frequency values of thousands vs impact factors of no more than 40 vs percentages that are no more than 1.0. 

To simplify this, we can also each variable such that it always falls in the `[0, 1]` range. I believe this would make the interpretation of the coefficients much easier for us.

This means that the highest impact factor is `1.0`, the max frequency is `1.0`, etc. The coefficients entered manually by us will be directly comparable.

# Defining coefficients' values

The interface will show up fields to alter the coefficients that control the weight of each component in the formula. If the user changes them, the visualization will alter its representation on the fly.

Initially, I will set a weight of `1.0` to frequency and of `0` to the remaining terms. The team can play around with the formula on interface to find a reasonable weight function.

Once we settle down on a specific set of coefficients, I will make it default on the interface.

