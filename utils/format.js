// Fonctions de formatage de nombres et montants, utilisées dans toute l'app.

export function fmt(n, dec=2){
  return isNaN(n) ? "—" : Number(n).toFixed(dec);
}

export function fmtE(n){
  return isNaN(n) ? "—" : Number(n).toFixed(2)+"€";
}
