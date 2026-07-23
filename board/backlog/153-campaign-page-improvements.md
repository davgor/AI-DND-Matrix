# EPIC: Campaign page improvements

Polish and product fixes for the **campaign review / campaign page** surfaces (post-create world review before continue, and related hub/review chrome). Generative-token preference stays a **campaign-start** decision only.

## Scope

| # | Slice |
|---|--------|
| 1 | Remove mid-campaign **"Use generative tokens?"** checkbox from campaign review — flag is set only at campaign start |
| … | Further campaign-page items land as `153.M` under this epic |

## Definition of done

- Campaign review no longer offers a generative-tokens toggle; start form still does
- Sub-tickets checked off with delivery gate (test / lint / build / deadcode / `act`)
- Epic stays open until remaining campaign-page slices are done
