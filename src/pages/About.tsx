import React from "react";

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">O LabGuard-u</h1>
        <p className="text-muted-foreground mt-2">
          LabGuard je web aplikacija za siguran unos, pregled i praćenje laboratorijskih nalaza uz pametne preporuke o načinu života.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-semibold">Naša misija</h2>
        <p className="text-muted-foreground">
          Da svako ima jasan uvid u svoje zdravstvene parametre, bez stresa, bez komplikacija. LabGuard pretvara suve nalaze u razumljive uvide i trendove, potpuno lokalno i privatno.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Zašto LabGuard</h2>
        <ul className="list-disc ml-6 text-muted-foreground space-y-2">
          <li>Automatsko prepoznavanje analita, jedinica i referentnih intervala iz PDF-a.</li>
          <li>Pamćenje datuma nalaza i prikaz trendova kroz vrijeme.</li>
          <li>Neutralne preporuke o ishrani i navikama,  bez dijagnostike i bez zamjene za ljekara.</li>
          <li>Privatnost na prvom mjestu: vaši podaci pripadaju vama.</li>
        </ul>
      </section>

      

      <section>
        <h2 className="text-xl font-semibold">Privatnost i bezbjednost</h2>
        <p className="text-muted-foreground">
          LabGuard radi po principu najmanjeg skupa podataka. AI moduli imaju pristup samo vašem profilu i vašim nalazima — nikad tuđim.
        </p>
      </section>
    </div>
  );
}
