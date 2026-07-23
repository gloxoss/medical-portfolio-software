
## ACP \& K‑means – Full Course + TD‑Style Examples + New Exercises

*(Markdown version – you can copy‑paste this into any editor and export to PDF)*

***

# 1. Analyse en Composantes Principales (ACP)

## 1.1. Objectif et intuition

- On a un tableau de données de taille $n \times p$ :
    - $n$ individus (lignes)
    - $p$ variables (colonnes)
- Problème :
    - Trop de variables.
    - Variables corrélées → redondance d’information.

**But de l’ACP**
Construire de nouveaux axes (composantes principales) qui :

- sont des combinaisons linéaires des variables d’origine,
- sont non corrélés entre eux,
- capturent le maximum de **variance** (inertie),
- permettent de résumer les données avec quelques axes (souvent 1 ou 2).

**Intuition géométrique**

- Les individus forment un nuage de points dans $\mathbb{R}^p$.
- L’ACP recherche la **meilleure droite**, puis le meilleur plan, etc.,
- “Meilleure” = celle qui **étale le plus** les projections → variance maximale.

***

## 1.2. Préparation des données : centrage et réduction

On part d’une matrice $X$ (taille $n \times p$) avec les valeurs $x_{ij}$.

### 1.2.1. Centrage

Pour chaque variable $j$ :

1. Moyenne

$$
\bar X_j = \frac{1}{n} \sum_{i=1}^n x_{ij}
$$
2. On remplace $x_{ij}$ par $x_{ij} - \bar X_j$.

Résultat :

- Une matrice centrée $X_c$.
- Chaque colonne a une moyenne 0.
- Géométriquement : le centre du nuage est déplacé à l’origine.


### 1.2.2. Réduction (standardisation)

Problème :

- Variables avec unités / échelles différentes (m, kg, DH, etc.).
- ACP est sensible aux grandes variances → les variables “grandes” dominent.

Pour chaque variable centrée $j$ :

1. Écart‑type

$$
s_j = \sqrt{\frac{1}{n} \sum_{i=1}^n (x_{ij} - \bar X_j)^2}
$$
2. Standardisation

$$
z_{ij} = \frac{x_{ij} - \bar X_j}{s_j}
$$

Résultat : matrice $Z$ (centrée‑réduite) :

- Moyenne de chaque variable = 0.
- Variance de chaque variable = 1.

**Pourquoi ?**

- Met toutes les variables sur un **pied d’égalité**.
- Permet d’utiliser directement la **matrice de corrélation**.

***

## 1.3. Matrice de corrélation

À partir de $Z$ (données centrées‑réduites), on définit :

$$
R = \frac{1}{n} Z^T Z
$$

- $R$ est une matrice $p \times p$.
- $R$ est symétrique.
- $R_{ii} = 1$ (corrélation d’une variable avec elle‑même).
- $R_{ij}$ = corrélation linéaire entre les variables $i$ et $j$.

Interprétation de $R_{ij}$ :

- $R_{ij} \approx 1$ : forte corrélation positive.
- $R_{ij} \approx -1$ : forte corrélation négative.
- $R_{ij} \approx 0$ : quasi pas de lien linéaire.

**Inertie totale**

- Pour des variables standardisées :

$$
\text{Trace}(R) = \sum_{j=1}^p R_{jj} = p
$$
- On appelle cela l’**inertie totale** (quantité d’information totale).

***

## 1.4. Valeurs propres et vecteurs propres

On diagonalise la matrice de corrélation $R$.

### 1.4.1. Problème aux valeurs propres

On cherche $(\lambda_k, u_k)$ tels que :

$$
R u_k = \lambda_k u_k
$$

- $\lambda_k$ : valeur propre.
- $u_k$ : vecteur propre associé (norme 1).

On obtient :

- des valeurs propres ordonnées :

$$
\lambda_1 \ge \lambda_2 \ge \dots \ge \lambda_p \ge 0
$$
- des vecteurs propres orthogonaux $u_1, \dots, u_p$.


### 1.4.2. Inertie par axe

Inertie de l’axe $k$ :

$$
I_k = \lambda_k
$$

Pourcentage d’inertie :

$$
\%I_k = \frac{\lambda_k}{\sum_{j=1}^p \lambda_j} \times 100
     = \frac{\lambda_k}{p} \times 100 \quad (\text{si ACP sur } R)
$$

**Critères usuels pour choisir le nombre d’axes**

- **Règle de Kaiser** : garder les axes avec $\lambda_k \ge 1$
    - Un axe doit expliquer au moins autant qu’une variable standardisée.
- **Scree plot (coude)** :
    - tracer les $\lambda_k$ en ordre décroissant,
    - garder les axes avant le “coude” (là où la courbe se casse).

***

## 1.5. Vecteurs propres = “loadings” = combinaison des variables

Le vecteur propre $u_k = (u_{k1}, \dots, u_{kp})^T$ définit le **kᵉ axe factoriel** :

$$
F_k = u_{k1} Z_1 + u_{k2} Z_2 + \dots + u_{kp} Z_p
$$

Interprétation de $u_{kj}$ :

- **Signe** :
    - même signe pour les variables j et l → elles vont dans le même sens sur l’axe $k$,
    - signe opposé → elles sont opposées.
- **Valeur absolue** :
    - $|u_{kj}|$ grand → variable j contribue fortement à l’axe,
    - $|u_{kj}|$ petit → variable j peu importante.

**Exemple profil élèves**

Variables : Maths, Physique, Français, Anglais.

Vecteur propre $u_1 = (0.6, 0.6, -0.4, -0.4)$ :

- Maths, Physique → coefficients positifs forts.
- Français, Anglais → coefficients négatifs.
- Axe F1 ≈ **opposition profil scientifique vs profil littéraire**.

***

## 1.6. Scores factoriels (coordonnées des individus)

Pour l’individu $i$, avec coordonnées standardisées $z_{i1}, \dots, z_{ip}$ :

$$
F_{ik} = z_{i1} u_{k1} + z_{i2} u_{k2} + \dots + z_{ip} u_{kp}
$$

- $F_{ik}$ = coordonnée de l’individu $i$ sur l’axe $k$.
- Géométriquement : projection du vecteur $z_i$ sur la direction $u_k$.

Usage :

- On trace les points $(F_{i1}, F_{i2})$ sur le plan (F1, F2).
- On interprète les positions (extrêmes, groupes, etc.).

***

## 1.7. Qualité de représentation : cos²

Pour l’individu $i$, on définit sa distance au centre (dans l’espace standardisé) :

$$
d_i^2 = \sum_{j=1}^p z_{ij}^2
$$

La qualité de représentation de l’individu $i$ sur l’axe $k$ :

$$
\cos^2(i, k) = \frac{F_{ik}^2}{d_i^2}
$$

Interprétation :

- $\cos^2 \approx 1$ → l’axe $k$ résume très bien cet individu.
- $\cos^2 \approx 0$ → l’axe $k$ est peu pertinent pour cet individu.
- Souvent, on considère qu’au‑dessus de 0.7 la représentation est très bonne.

***

## 1.8. Exemple complet ACP – type TD1 Exercice 1

### 1.8.1. Données

On a 3 individus et 2 variables C1 et C2 :


| Individu | C1 | C2 |
| :-- | :-- | :-- |
| 1 | 4 | 5 |
| 2 | 6 | 7 |
| 3 | 8 | 0 |

### 1.8.2. Étape 1 – Centrage

Moyennes :

- $\bar C_1 = (4 + 6 + 8)/3 = 6$
- $\bar C_2 = (5 + 7 + 0)/3 = 12/3 = 4$

Données centrées :


| Individu | $C1_c$ | $C2_c$ |
| :-- | :-- | :-- |
| 1 | 4 − 6 = −2 | 5 − 4 = 1 |
| 2 | 6 − 6 = 0 | 7 − 4 = 3 |
| 3 | 8 − 6 = 2 | 0 − 4 = −4 |

Matrice centrée $Z_c$ :

$$
Z_c =
\begin{pmatrix}
-2 & 1 \\
0 & 3 \\
2 & -4
\end{pmatrix}
$$

*(Dans le corrigé de TD, on travaille directement sur cette matrice centrée.)*

### 1.8.3. Étape 2 – Matrice de dispersion / corrélation

On calcule :

$$
R = \frac{1}{n} Z_c^T Z_c
$$

1. Transposée :

$$
Z_c^T =
\begin{pmatrix}
-2 & 0 & 2 \\
1 & 3 & -4
\end{pmatrix}
$$

2. Produit :

$$
Z_c^T Z_c =
\begin{pmatrix}
(-2)^2 + 0^2 + 2^2 & (-2)·1 + 0·3 + 2·(-4) \\
1·(-2) + 3·0 + (-4)·2 & 1^2 + 3^2 + (-4)^2
\end{pmatrix}
=
\begin{pmatrix}
8 & -10 \\
-10 & 26
\end{pmatrix}
$$

3. Division par $n = 3$ :

$$
R =
\frac{1}{3}
\begin{pmatrix}
8 & -10 \\
-10 & 26
\end{pmatrix}
=
\begin{pmatrix}
8/3 & -10/3 \\
-10/3 & 26/3
\end{pmatrix}
$$

### 1.8.4. Étape 3 – Valeurs propres

On résout :

$$
\det(R - \lambda I) = 0
$$

Avec $R = \begin{pmatrix} a & b \\ b & d \end{pmatrix}$, le polynôme caractéristique est :

$$
(a - \lambda)(d - \lambda) - b^2 = 0
$$

Ici :

- $a = 8/3$,
- $b = -10/3$,
- $d = 26/3$.

On obtient deux valeurs propres $\lambda_1 > \lambda_2$.
(En examen, soit on laisse en forme exacte, soit on donne des valeurs approchées, soit l’énoncé les fournit.)

### 1.8.5. Étape 4 – Vecteur propre principal

Pour $\lambda_1$, on résout :

$$
(R - \lambda_1 I) u_1 = 0
$$

On cherche un vecteur propre non nul $u_1 = (u_{11}, u_{12})^T$, puis on normalise pour avoir $\|u_1\| = 1$.

### 1.8.6. Étape 5 – Inertie expliquée par l’axe 1

Inertie totale :

$$
I_{\text{tot}} = \lambda_1 + \lambda_2
$$

Pourcentage d’inertie de F1 :

$$
\%I_1 = \frac{\lambda_1}{\lambda_1 + \lambda_2} \times 100
$$

Si $\%I_1$ est très élevé (par ex. > 80 %), on conclut :

- Le premier axe résume quasiment toute l’information.
- Les données sont quasi “unidimensionnelles”.


### 1.8.7. Étape 6 – Scores sur F1

Pour l’individu $i$ avec coordonnées centrées $(z_{i1}, z_{i2})$ et vecteur propre $u_1 = (u_{11}, u_{12})$ :

$$
F_{i1} = z_{i1} u_{11} + z_{i2} u_{12}
$$

On calcule $F_{11}, F_{21}, F_{31}$.

### 1.8.8. Étape 7 – cos² sur F1

Distance au centre pour l’individu $i$ :

$$
d_i^2 = z_{i1}^2 + z_{i2}^2
$$

Qualité de représentation :

$$
\cos^2(i, 1) = \frac{F_{i1}^2}{d_i^2}
$$

- $\cos^2$ près de 1 → individu très bien projeté sur F1.
- $\cos^2$ ≈ 0.5 → représentation moyenne.

***

## 1.9. Exemple ACP 2×2, données standardisées (type TD1 Exercice 2)

Supposons que les données ont déjà été centrées et réduites.
La matrice de corrélation est :

$$
R =
\begin{pmatrix}
1 & r \\
r & 1
\end{pmatrix}
$$

### 1.9.1. Valeurs propres

Polynôme :

$$
\det(R - \lambda I) =
\begin{vmatrix}
1 - \lambda & r \\
r & 1 - \lambda
\end{vmatrix}
= (1 - \lambda)^2 - r^2 = 0
$$

Solutions :

$$
\lambda_1 = 1 + r, \quad \lambda_2 = 1 - r
$$

Inertie totale : $\lambda_1 + \lambda_2 = 2$.

Pourcentages :

- Axe 1 : $\%I_1 = \frac{1 + r}{2} \times 100$
- Axe 2 : $\%I_2 = \frac{1 - r}{2} \times 100$

Si $r$ est très proche de 1 :

- $\lambda_1 \approx 2$, $\lambda_2 \approx 0$.
- Toute l’info est sur F1.


### 1.9.2. Vecteurs propres

- Pour $\lambda_1 = 1 + r$, un vecteur propre est approximativement $u_1 \propto (1, 1)$.
- Pour $\lambda_2 = 1 - r$, un vecteur propre est $u_2 \propto (1, -1)$.

Normalisation :

- $u_1 = (1/\sqrt{2}, 1/\sqrt{2})$
- $u_2 = (1/\sqrt{2}, -1/\sqrt{2})$

Interprétation :

- F1 ≈ moyenne des deux variables → elles évoluent ensemble.
- F2 ≈ différence → information résiduelle.

***

## 1.10. Exemple interprétation de profils (type TD1 Exercice 3)

Variables : Maths, Physique, Français, Anglais.
Supposons que l’ACP donne :

- $\lambda_1 = 2.8$ (sur 4 variables → 70 % de l’inertie),
- vecteur propre $u_1 = (0.6, 0.6, -0.4, -0.4)$.


### 1.10.1. Signe des coefficients

- Maths, Physique → coefficients positifs.
- Français, Anglais → coefficients négatifs.

→ F1 oppose :

- profil **scientifique** (notes fortes en Maths/Physique),
- profil **littéraire** (notes fortes en Français/Anglais).


### 1.10.2. Scores d’élèves

Supposons :

- Élève A : $F_{A1} = 3.2$,
- Élève B : $F_{B1} = -2.5$.

Interprétation :

- A : score très positif → très scientifique.
- B : score négatif → très littéraire.


### 1.10.3. cos² pour l’élève A

Si la distance au centre vaut $d_A^2 = 11$ :

$$
\cos^2(A, 1) = \frac{F_{A1}^2}{d_A^2} = \frac{3.2^2}{11} \approx 0.93
$$

→ 93 % de l’inertie de A est expliquée par F1 → représentation excellente.

***

# 2. K‑means (Clustering)

## 2.1. Idée générale

K‑means est une méthode de **classification non supervisée**.

- Entrée : un ensemble de points $x_1, \dots, x_n \in \mathbb{R}^d$.
- Paramètre : nombre de clusters $K$.

Objectif :

- Partitionner les points en $K$ clusters $C_1, \dots, C_K$,
- avec des clusters compacts et bien séparés.

Fonction objectif minimisée :

$$
\sum_{k=1}^K \sum_{x_i \in C_k} \|x_i - c_k\|^2
$$

où $c_k$ est le **centre (centroïde)** du cluster $C_k$.

***

## 2.2. Algorithme de K‑means

1. **Initialisation**
    - Choisir $K$ centres initiaux $c_1^{(0)}, \dots, c_K^{(0)}$
(souvent en prenant des points existants).
2. **Étape d’affectation**
    - Pour chaque point $x_i$, calculer sa distance à chaque centre.
    - Affecter $x_i$ au cluster dont le centre est le plus proche.
3. **Étape de mise à jour**
    - Pour chaque cluster $k$, recalculer le nouveau centre :

$$
c_k^{(t+1)} = \frac{1}{|C_k^{(t)}|} \sum_{x_i \in C_k^{(t)}} x_i
$$
4. **Répéter** les étapes 2 et 3 jusqu’à convergence :
    - plus aucun point ne change de cluster, OU
    - les centres ne bougent plus (ou très peu).

**Distance utilisée** : distance euclidienne.

- En 1D : $|x - c|$.
- En 2D : $\sqrt{(x_1 - c_1)^2 + (x_2 - c_2)^2}$.

***

## 2.3. Exemple K‑means 1D – type TD2 Exercice 1

Points :

$$
D = \{1, 3, 6, 8, 10, 11, 12, 22, 24, 26, 31, 57\}
$$

Nombre de clusters : $K = 4$.

Centres initiaux :

- $c_1^{(0)} = 6$
- $c_2^{(0)} = 12$
- $c_3^{(0)} = 26$
- $c_4^{(0)} = 31$


### 2.3.1. Itération 1 – affectation

Pour chaque point, on calcule la distance à chaque centre et on prend le plus proche.

Exemples :

- $x = 1$ :
    - $|1 - 6| = 5$
    - $|1 - 12| = 11$
    - $|1 - 26| = 25$
    - $|1 - 31| = 30$
→ le plus petit est 5 → $1 \in C_1$.
- $x = 3$ :
    - $|3 - 6| = 3$
    - $|3 - 12| = 9$
    - $|3 - 26| = 23$
    - $|3 - 31| = 28$
→ $3 \in C_1$.

On fait ça pour tous les points et on obtient les clusters (résultat cohérent avec le TD corrigé) :

- $C_1^{(0)} = \{1, 3, 6, 8\}$
- $C_2^{(0)} = \{10, 11, 12\}$
- $C_3^{(0)} = \{22, 24, 26\}$
- $C_4^{(0)} = \{31, 57\}$


### 2.3.2. Itération 1 – mise à jour des centres

On calcule la moyenne de chaque cluster :

- $c_1^{(1)} = (1 + 3 + 6 + 8)/4 = 18/4 = 4.5$
- $c_2^{(1)} = (10 + 11 + 12)/3 = 33/3 = 11$
- $c_3^{(1)} = (22 + 24 + 26)/3 = 72/3 = 24$
- $c_4^{(1)} = (31 + 57)/2 = 88/2 = 44$


### 2.3.3. Itération 2 – nouvelle affectation

On refait l’étape d’affectation avec les centres $(4.5, 11, 24, 44)$.

On trouve :

- $C_1^{(1)} = \{1, 3, 6\}$
- $C_2^{(1)} = \{8, 10, 11, 12\}$
- $C_3^{(1)} = \{22, 24, 26\}$
- $C_4^{(1)} = \{31, 57\}$


### 2.3.4. Itération 2 – mise à jour

- $c_1^{(2)} = (1 + 3 + 6)/3 \approx 3.33$
- $c_2^{(2)} = (8 + 10 + 11 + 12)/4 = 41/4 = 10.25$
- $c_3^{(2)} = 24$
- $c_4^{(2)} = 44$

Une nouvelle itération donnerait les mêmes clusters → convergence.

**Résultat final**

- Clusters :
    - $C_1 = \{1, 3, 6\}$
    - $C_2 = \{8, 10, 11, 12\}$
    - $C_3 = \{22, 24, 26\}$
    - $C_4 = \{31, 57\}$
- Centres finaux ≈ $(3.33, 10.25, 24, 44)$
- Nombre d’itérations : 2.

***

## 2.4. Exemple K‑means 2D – type TD2 Exercice 2

Points dans $\mathbb{R}^2$ :

- A = (1, 1)
- B = (1.5, 2)
- C = (3, 4)
- D = (5, 7)
- E = (3.5, 5)
- F = (4.5, 5)

On fixe $K = 2$.

Centres initiaux :

- $C_1^{(0)} = A = (1, 1)$
- $C_2^{(0)} = D = (5, 7)$


### 2.4.1. Itération 1 – affectation

On calcule la distance euclidienne aux centres.

Exemples :

- Pour A :
    - $d(A, C_1) = 0$
    - $d(A, C_2) = \sqrt{(1 - 5)^2 + (1 - 7)^2} = \sqrt{52} \approx 7.21$
→ A dans C1.
- Pour B = (1.5, 2) :
    - $d(B, C_1) = \sqrt{0.5^2 + 1^2} = \sqrt{1.25} \approx 1.12$
    - $d(B, C_2) \approx 6.10$
→ B dans C1.
- Pour C = (3, 4) :
    - distance similaire à C1 et C2, mais dans le corrigé on choisit C1.
- Pour D, E, F : plus proches de C2.

Résultat :

- $C_1^{(0)} = \{A, B, C\}$
- $C_2^{(0)} = \{D, E, F\}$


### 2.4.2. Itération 1 – mise à jour

Centre de C1 :

- Coordonnée x : (1 + 1.5 + 3)/3 = 5.5/3 ≈ 1.83
- Coordonnée y : (1 + 2 + 4)/3 = 7/3 ≈ 2.33

Donc $C_1^{(1)} ≈ (1.83, 2.33)$.

Centre de C2 :

- Coordonnée x : (5 + 3.5 + 4.5)/3 = 13/3 ≈ 4.33
- Coordonnée y : (7 + 5 + 5)/3 = 17/3 ≈ 5.67

Donc $C_2^{(1)} ≈ (4.33, 5.67)$.

### 2.4.3. Itération 2 – affectation

Avec les nouveaux centres, on recalcule les distances.
On trouve que A, B, C restent plus proches de $C_1^{(1)}$, et D, E, F de $C_2^{(1)}$.

Les clusters ne changent plus → convergence (1 mise à jour suffisante).

**Résultat final**

- C1 = {A, B, C}, centre ≈ (1.83, 2.33)
- C2 = {D, E, F}, centre ≈ (4.33, 5.67)

***

# 3. Nouveaux exercices pour t’entraîner

*(Tu peux les faire à la main, puis revenir ici pour qu’on corrige ensemble.)*

## 3.1. Exercice ACP 1 – Corrélation parfaite

On considère 4 individus et 2 variables X1, X2 :


| Individu | X1 | X2 |
| :-- | :-- | :-- |
| 1 | 1 | 2 |
| 2 | 2 | 4 |
| 3 | 3 | 6 |
| 4 | 4 | 8 |

1. Centrer et réduire les données.
2. Calculer la matrice de corrélation $R$.
3. Déterminer les valeurs propres et vecteurs propres de $R$.
4. Calculer l’inertie expliquée par chaque axe.
5. Combien d’axes garder ? Justifier.

*(Hint : X2 = 2·X1 → corrélation quasi parfaite, un seul axe suffit.)*

***

## 3.2. Exercice ACP 2 – Profil élève

Variables : Maths, Physique, Français, Anglais.

On sait que :

- $\lambda_1 = 3.0$ (sur 4 variables → 75 % d’inertie),
- $u_1 = (0.5, 0.5, -0.5, -0.5)$.

Pour un élève C, données standardisées :

- $z_C = (1.5, 1.0, -0.5, -1.0)$.

1. Interpréter l’axe 1 en termes de profil.
2. Calculer le score $F_{C1}$.
3. Si $d_C^2 = 4.5$, calculer $\cos^2(C,1)$.
4. La représentation de C sur l’axe 1 est‑elle bonne ?

***

## 3.3. Exercice K‑means 1 – 1D simple

Points :

$$
\{2, 3, 4, 10, 11, 12\}
$$

K = 2, centres initiaux :

- $c_1^{(0)} = 3$
- $c_2^{(0)} = 11$

1. Faire l’itération 1 (affectations + nouveaux centres).
2. Faire l’itération 2.
3. Donner les clusters et centres finaux, et le nombre d’itérations jusqu’à convergence.

***

## 3.4. Exercice K‑means 2 – 2D simple

Points :

- P1 = (0, 0)
- P2 = (0, 1)
- P3 = (1, 0)
- P4 = (5, 5)
- P5 = (6, 5)
- P6 = (5, 6)

K = 2, centres initiaux :

- $C_1^{(0)} = P1$
- $C_2^{(0)} = P4$

1. Faire une première itération complète (affectation + mise à jour).
2. Faire une deuxième itération.
3. Donner les clusters et centres finaux.

***

Tu peux maintenant coller ce Markdown dans VS Code / Obsidian / Notion, le styliser (titres, surlignage, formules) puis exporter en PDF propre.

Pour continuer à bosser ensemble : veux‑tu qu’on prenne **un exercice précis de ce document** (par exemple ACP TD1 Ex 1 ou K‑means 1D) et que tu tentes la première étape, pendant qu’on corrige au fur et à mesure ?

