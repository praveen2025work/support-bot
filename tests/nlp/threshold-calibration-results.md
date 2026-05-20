# B-2.0 NLP Ensemble Calibration — Results

Run: 2026-05-20T04:26:28.897Z
Test set: 30 queries (15 in-corpus, 10 paraphrase, 5 OOD).
Sweep: 7 weight configs × 6 thresholds = 42 combos.

Composite score = correct_confident + 0.5·correct_disambig + ood_correct_below + ood_correct_disambig − 2·pos_wrong_confident − 3·ood_false_confident.
Higher is better.

## Top 5 configs

| Rank | Weights (NLP/TFIDF/Pattern)  | Threshold | Pos correct (conf/disambig) | Pos wrong | Pos below | OOD false-conf | OOD below+disambig | Composite |
| ---- | ---------------------------- | --------- | --------------------------- | --------- | --------- | -------------- | ------------------ | --------- |
| 1    | nlp-dominant (0.6/0.2/0.2)   | 0.65      | 16/0 of 25                  | 0         | 9         | 0/5            | 5/5                | 21.00     |
| 2    | tfidf-heavy (0.3/0.5/0.2)    | 0.5       | 15/0 of 25                  | 0         | 10        | 0/5            | 5/5                | 20.00     |
| 3    | pattern-boost (0.4/0.3/0.3)  | 0.5       | 15/0 of 25                  | 0         | 10        | 0/5            | 5/5                | 20.00     |
| 4    | current (0.5/0.3/0.2)        | 0.6       | 14/0 of 25                  | 0         | 11        | 0/5            | 5/5                | 19.00     |
| 5    | tfidf-balanced (0.4/0.4/0.2) | 0.5       | 18/0 of 25                  | 0         | 7         | 1/5            | 4/5                | 19.00     |

## All combos

| Weights                      | Threshold | pos_conf | pos_disambig | pos_wrong | pos_below | ood_false | ood_below | ood_disambig | score |
| ---------------------------- | --------: | -------: | -----------: | --------: | --------: | --------: | --------: | -----------: | ----: |
| current (0.5/0.3/0.2)        |       0.3 |       19 |            0 |         5 |         1 |         5 |         0 |            0 | -6.00 |
| current (0.5/0.3/0.2)        |       0.4 |       19 |            0 |         3 |         3 |         4 |         1 |            0 |  2.00 |
| current (0.5/0.3/0.2)        |       0.5 |       19 |            0 |         2 |         4 |         2 |         3 |            0 | 12.00 |
| current (0.5/0.3/0.2)        |       0.6 |       14 |            0 |         0 |        11 |         0 |         5 |            0 | 19.00 |
| current (0.5/0.3/0.2)        |      0.65 |       12 |            0 |         0 |        13 |         0 |         5 |            0 | 17.00 |
| current (0.5/0.3/0.2)        |       0.7 |        8 |            0 |         0 |        17 |         0 |         5 |            0 | 13.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.3 |       19 |            0 |         5 |         1 |         5 |         0 |            0 | -6.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.4 |       19 |            0 |         5 |         1 |         5 |         0 |            0 | -6.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.5 |       19 |            0 |         3 |         3 |         5 |         0 |            0 | -2.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.6 |       19 |            0 |         2 |         4 |         3 |         2 |            0 |  8.00 |
| nlp-heavy (0.7/0.2/0.1)      |      0.65 |       18 |            0 |         2 |         5 |         3 |         2 |            0 |  7.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.7 |       17 |            0 |         2 |         6 |         1 |         4 |            0 | 14.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.3 |       19 |            0 |         5 |         1 |         5 |         0 |            0 | -6.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.4 |       19 |            0 |         4 |         2 |         5 |         0 |            0 | -4.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.5 |       19 |            0 |         2 |         4 |         4 |         1 |            0 |  4.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.6 |       19 |            0 |         2 |         4 |         2 |         3 |            0 | 12.00 |
| nlp-dominant (0.6/0.2/0.2)   |      0.65 |       16 |            0 |         0 |         9 |         0 |         5 |            0 | 21.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.7 |       12 |            0 |         0 |        13 |         0 |         5 |            0 | 17.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.3 |       19 |            0 |         3 |         3 |         4 |         0 |            1 |  2.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.4 |       19 |            0 |         2 |         4 |         2 |         2 |            1 | 12.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.5 |       18 |            0 |         0 |         7 |         1 |         3 |            1 | 19.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.6 |       11 |            0 |         0 |        14 |         0 |         4 |            1 | 16.00 |
| tfidf-balanced (0.4/0.4/0.2) |      0.65 |       10 |            0 |         0 |        15 |         0 |         4 |            1 | 15.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.7 |        4 |            0 |         0 |        21 |         0 |         4 |            1 |  9.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.3 |       19 |            0 |         3 |         3 |         3 |         2 |            0 |  6.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.4 |       18 |            0 |         1 |         6 |         1 |         4 |            0 | 17.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.5 |       15 |            0 |         0 |        10 |         0 |         5 |            0 | 20.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.6 |       10 |            0 |         0 |        15 |         0 |         5 |            0 | 15.00 |
| tfidf-heavy (0.3/0.5/0.2)    |      0.65 |        4 |            0 |         0 |        21 |         0 |         5 |            0 |  9.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.7 |        2 |            0 |         0 |        23 |         0 |         5 |            0 |  7.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.3 |       19 |            0 |         3 |         3 |         5 |         0 |            0 | -2.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.4 |       19 |            0 |         2 |         4 |         2 |         3 |            0 | 12.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.5 |       15 |            0 |         0 |        10 |         0 |         5 |            0 | 20.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.6 |       10 |            0 |         0 |        15 |         0 |         5 |            0 | 15.00 |
| pattern-boost (0.4/0.3/0.3)  |      0.65 |        8 |            0 |         0 |        17 |         0 |         5 |            0 | 13.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.7 |        8 |            0 |         0 |        17 |         0 |         5 |            0 | 13.00 |
| uniform (0.34/0.33/0.33)     |       0.3 |       19 |            0 |         3 |         3 |         3 |         2 |            0 |  6.00 |
| uniform (0.34/0.33/0.33)     |       0.4 |       18 |            0 |         1 |         6 |         1 |         4 |            0 | 17.00 |
| uniform (0.34/0.33/0.33)     |       0.5 |       13 |            0 |         0 |        12 |         0 |         5 |            0 | 18.00 |
| uniform (0.34/0.33/0.33)     |       0.6 |        9 |            0 |         0 |        16 |         0 |         5 |            0 | 14.00 |
| uniform (0.34/0.33/0.33)     |      0.65 |        8 |            0 |         0 |        17 |         0 |         5 |            0 | 13.00 |
| uniform (0.34/0.33/0.33)     |       0.7 |        6 |            0 |         0 |        19 |         0 |         5 |            0 | 11.00 |

## Per-query detail at current default (0.5/0.3/0.2 + threshold 0.65)

| Text                                    | Tag        | Expected       | Top              | Score |   2nd | Verdict   |
| --------------------------------------- | ---------- | -------------- | ---------------- | ----: | ----: | --------- |
| hello                                   | in_corpus  | greeting       | greeting         | 0.750 | 0.000 | ✓ correct |
| good morning                            | in_corpus  | greeting       | greeting         | 0.749 | 0.000 | ✓ correct |
| help                                    | in_corpus  | help           | help             | 0.781 | 0.000 | ✓ correct |
| what can you do?                        | in_corpus  | help           | help             | 0.754 | 0.067 | ✓ correct |
| list queries                            | in_corpus  | query.list     | query.list       | 0.840 | 0.053 | ✓ correct |
| show me available queries               | in_corpus  | query.list     | query.list       | 0.690 | 0.147 | ✓ correct |
| run monthly_revenue                     | in_corpus  | query.execute  | query.execute    | 0.683 | 0.049 | ✓ correct |
| execute active_users                    | in_corpus  | query.execute  | query.execute    | 0.670 | 0.000 | ✓ correct |
| find documentation                      | in_corpus  | url.find       | knowledge.search | 0.567 | 0.093 | — below   |
| where is the api docs                   | in_corpus  | url.find       | knowledge.search | 0.430 | 0.142 | — below   |
| goodbye                                 | in_corpus  | farewell       | farewell         | 0.791 | 0.000 | ✓ correct |
| bye                                     | in_corpus  | farewell       | farewell         | 0.807 | 0.000 | ✓ correct |
| estimate query duration                 | in_corpus  | query.estimate | query.estimate   | 0.587 | 0.160 | — below   |
| search documents                        | in_corpus  | document.ask   | knowledge.search | 0.276 | 0.262 | — below   |
| list documents                          | in_corpus  | document.list  | knowledge.search | 0.338 | 0.262 | — below   |
| show revenue numbers                    | paraphrase | query.execute  | query.execute    | 0.548 | 0.026 | — below   |
| how many active users do we have        | paraphrase | query.execute  | query.estimate   | 0.500 | 0.000 | — below   |
| i want to see the revenue this month    | paraphrase | query.execute  | farewell         | 0.338 | 0.193 | — below   |
| can you list out the queries i can run  | paraphrase | query.list     | query.list       | 0.572 | 0.100 | — below   |
| what queries are available to me        | paraphrase | query.list     | query.list       | 0.692 | 0.057 | ✓ correct |
| i need help getting started             | paraphrase | help           | help             | 0.728 | 0.049 | ✓ correct |
| how does this thing work                | paraphrase | help           | help             | 0.590 | 0.077 | — below   |
| where can i find the deployment runbook | paraphrase | url.find       | url.find         | 0.600 | 0.091 | — below   |
| give me the link to the dashboard       | paraphrase | url.find       | url.find         | 0.633 | 0.025 | — below   |
| thanks talk later                       | paraphrase | farewell       | farewell         | 0.612 | 0.000 | — below   |
| what is the capital of france           | ood        | (none)         | knowledge.search | 0.487 | 0.013 | — below   |
| asdfghjkl qwerty                        | ood        | (none)         | query.list       | 0.397 | 0.299 | — below   |
| tell me a joke                          | ood        | (none)         | knowledge.search | 0.550 | 0.010 | — below   |
| do you like pizza                       | ood        | (none)         | help             | 0.554 | 0.126 | — below   |
| the weather is nice today               | ood        | (none)         | knowledge.search | 0.421 | 0.054 | — below   |
