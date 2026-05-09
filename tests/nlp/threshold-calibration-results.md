# B-2.0 NLP Ensemble Calibration — Results

Run: 2026-05-09T04:50:01.903Z
Test set: 30 queries (15 in-corpus, 10 paraphrase, 5 OOD).
Sweep: 7 weight configs × 6 thresholds = 42 combos.

Composite score = correct_confident + 0.5·correct_disambig + ood_correct_below + ood_correct_disambig − 2·pos_wrong_confident − 3·ood_false_confident.
Higher is better.

## Top 5 configs

| Rank | Weights (NLP/TFIDF/Pattern)  | Threshold | Pos correct (conf/disambig) | Pos wrong | Pos below | OOD false-conf | OOD below+disambig | Composite |
| ---- | ---------------------------- | --------- | --------------------------- | --------- | --------- | -------------- | ------------------ | --------- |
| 1    | uniform (0.34/0.33/0.33)     | 0.4       | 20/0 of 25                  | 0         | 5         | 0/5            | 5/5                | 25.00     |
| 2    | tfidf-heavy (0.3/0.5/0.2)    | 0.4       | 19/0 of 25                  | 0         | 6         | 0/5            | 5/5                | 24.00     |
| 3    | tfidf-balanced (0.4/0.4/0.2) | 0.5       | 18/0 of 25                  | 0         | 7         | 0/5            | 5/5                | 23.00     |
| 4    | nlp-dominant (0.6/0.2/0.2)   | 0.6       | 19/0 of 25                  | 1         | 5         | 0/5            | 5/5                | 22.00     |
| 5    | pattern-boost (0.4/0.3/0.3)  | 0.5       | 17/0 of 25                  | 0         | 8         | 0/5            | 5/5                | 22.00     |

## All combos

| Weights                      | Threshold | pos_conf | pos_disambig | pos_wrong | pos_below | ood_false | ood_below | ood_disambig | score |
| ---------------------------- | --------: | -------: | -----------: | --------: | --------: | --------: | --------: | -----------: | ----: |
| current (0.5/0.3/0.2)        |       0.3 |       21 |            0 |         3 |         1 |         3 |         2 |            0 |  8.00 |
| current (0.5/0.3/0.2)        |       0.4 |       20 |            0 |         2 |         3 |         2 |         3 |            0 | 13.00 |
| current (0.5/0.3/0.2)        |       0.5 |       19 |            0 |         1 |         5 |         1 |         4 |            0 | 18.00 |
| current (0.5/0.3/0.2)        |       0.6 |       16 |            0 |         0 |         9 |         0 |         5 |            0 | 21.00 |
| current (0.5/0.3/0.2)        |      0.65 |       11 |            0 |         0 |        14 |         0 |         5 |            0 | 16.00 |
| current (0.5/0.3/0.2)        |       0.7 |        8 |            0 |         0 |        17 |         0 |         5 |            0 | 13.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.3 |       21 |            0 |         4 |         0 |         5 |         0 |            0 | -2.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.4 |       21 |            0 |         3 |         1 |         4 |         1 |            0 |  4.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.5 |       20 |            0 |         3 |         2 |         2 |         3 |            0 | 11.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.6 |       19 |            0 |         2 |         4 |         1 |         4 |            0 | 16.00 |
| nlp-heavy (0.7/0.2/0.1)      |      0.65 |       18 |            0 |         2 |         5 |         1 |         4 |            0 | 15.00 |
| nlp-heavy (0.7/0.2/0.1)      |       0.7 |       17 |            0 |         1 |         7 |         0 |         5 |            0 | 20.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.3 |       21 |            0 |         4 |         0 |         5 |         0 |            0 | -2.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.4 |       21 |            0 |         3 |         1 |         2 |         3 |            0 | 12.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.5 |       19 |            0 |         2 |         4 |         1 |         4 |            0 | 16.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.6 |       19 |            0 |         1 |         5 |         0 |         5 |            0 | 22.00 |
| nlp-dominant (0.6/0.2/0.2)   |      0.65 |       16 |            0 |         0 |         9 |         0 |         5 |            0 | 21.00 |
| nlp-dominant (0.6/0.2/0.2)   |       0.7 |       11 |            0 |         0 |        14 |         0 |         5 |            0 | 16.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.3 |       21 |            0 |         3 |         1 |         2 |         3 |            0 | 12.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.4 |       20 |            0 |         1 |         4 |         1 |         4 |            0 | 19.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.5 |       18 |            0 |         0 |         7 |         0 |         5 |            0 | 23.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.6 |       11 |            0 |         0 |        14 |         0 |         5 |            0 | 16.00 |
| tfidf-balanced (0.4/0.4/0.2) |      0.65 |        9 |            0 |         0 |        16 |         0 |         5 |            0 | 14.00 |
| tfidf-balanced (0.4/0.4/0.2) |       0.7 |        5 |            0 |         0 |        20 |         0 |         5 |            0 | 10.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.3 |       20 |            0 |         1 |         4 |         1 |         3 |            1 | 19.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.4 |       19 |            0 |         0 |         6 |         0 |         4 |            1 | 24.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.5 |       15 |            0 |         0 |        10 |         0 |         4 |            1 | 20.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.6 |       10 |            0 |         0 |        15 |         0 |         4 |            1 | 15.00 |
| tfidf-heavy (0.3/0.5/0.2)    |      0.65 |        5 |            0 |         0 |        20 |         0 |         4 |            1 | 10.00 |
| tfidf-heavy (0.3/0.5/0.2)    |       0.7 |        2 |            0 |         0 |        23 |         0 |         4 |            1 |  7.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.3 |       21 |            0 |         3 |         1 |         2 |         3 |            0 | 12.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.4 |       20 |            0 |         1 |         4 |         1 |         4 |            0 | 19.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.5 |       17 |            0 |         0 |         8 |         0 |         5 |            0 | 22.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.6 |       10 |            0 |         0 |        15 |         0 |         5 |            0 | 15.00 |
| pattern-boost (0.4/0.3/0.3)  |      0.65 |        7 |            0 |         0 |        18 |         0 |         5 |            0 | 12.00 |
| pattern-boost (0.4/0.3/0.3)  |       0.7 |        7 |            0 |         0 |        18 |         0 |         5 |            0 | 12.00 |
| uniform (0.34/0.33/0.33)     |       0.3 |       20 |            0 |         2 |         3 |         1 |         4 |            0 | 17.00 |
| uniform (0.34/0.33/0.33)     |       0.4 |       20 |            0 |         0 |         5 |         0 |         5 |            0 | 25.00 |
| uniform (0.34/0.33/0.33)     |       0.5 |       14 |            0 |         0 |        11 |         0 |         5 |            0 | 19.00 |
| uniform (0.34/0.33/0.33)     |       0.6 |        8 |            0 |         0 |        17 |         0 |         5 |            0 | 13.00 |
| uniform (0.34/0.33/0.33)     |      0.65 |        7 |            0 |         0 |        18 |         0 |         5 |            0 | 12.00 |
| uniform (0.34/0.33/0.33)     |       0.7 |        6 |            0 |         0 |        19 |         0 |         5 |            0 | 11.00 |

## Per-query detail at current default (0.5/0.3/0.2 + threshold 0.65)

| Text                                    | Tag        | Expected       | Top                  | Score |   2nd | Verdict   |
| --------------------------------------- | ---------- | -------------- | -------------------- | ----: | ----: | --------- |
| hello                                   | in_corpus  | greeting       | greeting             | 0.749 | 0.000 | ✓ correct |
| good morning                            | in_corpus  | greeting       | greeting             | 0.749 | 0.000 | ✓ correct |
| help                                    | in_corpus  | help           | help                 | 0.786 | 0.000 | ✓ correct |
| what can you do?                        | in_corpus  | help           | help                 | 0.745 | 0.135 | ✓ correct |
| list queries                            | in_corpus  | query.list     | query.list           | 0.840 | 0.132 | ✓ correct |
| show me available queries               | in_corpus  | query.list     | query.list           | 0.693 | 0.130 | ✓ correct |
| run monthly_revenue                     | in_corpus  | query.execute  | query.execute        | 0.445 | 0.162 | — below   |
| execute active_users                    | in_corpus  | query.execute  | query.execute        | 0.635 | 0.025 | — below   |
| find documentation                      | in_corpus  | url.find       | document.ask         | 0.384 | 0.085 | — below   |
| where is the api docs                   | in_corpus  | url.find       | knowledge.search     | 0.287 | 0.212 | — below   |
| goodbye                                 | in_corpus  | farewell       | farewell             | 0.793 | 0.000 | ✓ correct |
| bye                                     | in_corpus  | farewell       | farewell             | 0.810 | 0.000 | ✓ correct |
| estimate query duration                 | in_corpus  | query.estimate | query.estimate       | 0.626 | 0.118 | — below   |
| search documents                        | in_corpus  | document.ask   | document.ask         | 0.629 | 0.145 | — below   |
| list documents                          | in_corpus  | document.list  | document.list        | 0.732 | 0.129 | ✓ correct |
| show revenue numbers                    | paraphrase | query.execute  | followup.data_lookup | 0.495 | 0.060 | — below   |
| how many active users do we have        | paraphrase | query.execute  | followup.aggregation | 0.527 | 0.030 | — below   |
| i want to see the revenue this month    | paraphrase | query.execute  | query.execute        | 0.386 | 0.139 | — below   |
| can you list out the queries i can run  | paraphrase | query.list     | query.list           | 0.593 | 0.124 | — below   |
| what queries are available to me        | paraphrase | query.list     | query.list           | 0.662 | 0.176 | ✓ correct |
| i need help getting started             | paraphrase | help           | help                 | 0.613 | 0.131 | — below   |
| how does this thing work                | paraphrase | help           | help                 | 0.590 | 0.090 | — below   |
| where can i find the deployment runbook | paraphrase | url.find       | url.find             | 0.569 | 0.067 | — below   |
| give me the link to the dashboard       | paraphrase | url.find       | url.find             | 0.653 | 0.035 | ✓ correct |
| thanks talk later                       | paraphrase | farewell       | farewell             | 0.611 | 0.057 | — below   |
| what is the capital of france           | ood        | (none)         | followup.aggregation | 0.319 | 0.118 | — below   |
| asdfghjkl qwerty                        | ood        | (none)         | query.list           | 0.416 | 0.254 | — below   |
| tell me a joke                          | ood        | (none)         | knowledge.search     | 0.503 | 0.038 | — below   |
| do you like pizza                       | ood        | (none)         | confirm              | 0.291 | 0.247 | — below   |
| the weather is nice today               | ood        | (none)         | query.execute        | 0.264 | 0.137 | — below   |
