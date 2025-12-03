import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from tkcalendar import DateEntry
from fpdf import FPDF
import pdfplumber
from copy import deepcopy
import os

# --------------------------------------------------
# MODEL PODATAKA – TEMPLATE NA OSNOVU TVOG NALAZA
# --------------------------------------------------

TEMPLATE = {
    "laboratorija": "Poliklinika MojLab",
    "adresa1": "Laboratorija",
    "adresa2": "Moskovska 2c, 81000 Podgorica",
    "adresa3": "Tel: 19989, +382 68 209 020",
    "pacijent": {
        "ime": "Mihailo Đurović",
        "datum_rodjenja": "15.05.2004",
        "pol": "M",
    },
    "nalaz_info": {
        "lab_broj": "73 / 15.06.2024",
        "ljekar": "Lično -",
        "vrijeme_uzorkovanja": "15.06.2024. 08:49",
        "datum_izdavanja": "15.06.2024.",
    },
    "analiti": {
        # section: "H" = hematologija, "B" = biohemija
        "K-Eritrociti":     {"section": "H", "value": 5.24,  "ref": "4.50 - 5.80",  "unit": "10*12/L"},
        "K-Hemoglobin":     {"section": "H", "value": 153,   "ref": "130 - 170",   "unit": "g/L"},
        "K-Hematokrit":     {"section": "H", "value": 0.451, "ref": "0.380 - 0.510","unit": "L/L"},
        "K-MCV":            {"section": "H", "value": 86.1,  "ref": "81.0 - 97.0", "unit": "fL"},
        "K-MCH":            {"section": "H", "value": 29.2,  "ref": "28.0 - 33.0", "unit": "pg"},
        "K-MCHC":           {"section": "H", "value": 339,   "ref": "318 - 360",   "unit": "g/L"},
        "K-RDW":            {"section": "H", "value": 12.9,  "ref": "11.5 - 15.1", "unit": "%"},
        "K-Leukociti":      {"section": "H", "value": 5.61,  "ref": "4.00 - 10.00","unit": "10*9/L"},
        "K-Neutrofili %":   {"section": "H", "value": 40.9,  "ref": "50.0 - 75.0", "unit": "%"},
        "K-Limfociti %":    {"section": "H", "value": 43.9,  "ref": "20.0 - 40.0", "unit": "%"},
        "K-Monociti %":     {"section": "H", "value": 13.2,  "ref": "2.0 - 10.0",  "unit": "%"},
        "K-Eozinofili %":   {"section": "H", "value": 1.6,   "ref": "0.0 - 4.0",   "unit": "%"},
        "K-Bazofili %":     {"section": "H", "value": 0.4,   "ref": "0.0 - 1.0",   "unit": "%"},
        "K-Neutrofili aps.":{"section": "H", "value": 2.30,  "ref": "0.80 - 7.50", "unit": "10*9/L"},
        "K-Limfociti aps.": {"section": "H", "value": 2.46,  "ref": "0.80 - 4.00", "unit": "10*9/L"},
        "K-Monociti aps.":  {"section": "H", "value": 0.74,  "ref": "0.00 - 1.00", "unit": "10*9/L"},
        "K-Eozinofili aps.":{"section": "H", "value": 0.09,  "ref": "0.00 - 0.50", "unit": "10*9/L"},
        "K-Bazofili aps.":  {"section": "H", "value": 0.02,  "ref": "0.00 - 0.50", "unit": "10*9/L"},
        "K-Trombociti":     {"section": "H", "value": 179,   "ref": "150 - 400",   "unit": "10*9/L"},
        "K-MPV":            {"section": "H", "value": 10.1,  "ref": "9.1 - 11.9",  "unit": "fL"},
        "K-PCT":            {"section": "H", "value": 0.18,  "ref": "0.16 - 0.35", "unit": "%"},
        "S-Glukoza":        {"section": "B", "value": 5.2,   "ref": "3.9 - 5.9",   "unit": "mmol/L"},
    }
}

ORDER_HEM = [
    "K-Eritrociti", "K-Hemoglobin", "K-Hematokrit", "K-MCV", "K-MCH", "K-MCHC",
    "K-RDW", "K-Leukociti", "K-Neutrofili %", "K-Limfociti %", "K-Monociti %",
    "K-Eozinofili %", "K-Bazofili %", "K-Neutrofili aps.", "K-Limfociti aps.",
    "K-Monociti aps.", "K-Eozinofili aps.", "K-Bazofili aps.", "K-Trombociti",
    "K-MPV", "K-PCT"
]
ORDER_BIO = ["S-Glukoza"]

current_data = deepcopy(TEMPLATE)


# --------------------------------------------------
# PDF GENERATOR – layout sličan MojLab nalazu
# --------------------------------------------------

class MojLabPDF(FPDF):
    def _init_fonts(self):
        """Registruje Segoe font jednom po PDF objektu."""
        if not getattr(self, "_seg_fonts", False):
            self.add_font("Segoe", "", "C:/Windows/Fonts/segoeui.ttf", uni=True)
            self.add_font("Segoe", "B", "C:/Windows/Fonts/segoeuib.ttf", uni=True)
            self._seg_fonts = True

    def header(self):
        self._init_fonts()
        # Logo lijevo (opciono)
        logo_path = "mojlab_logo.png"
        if os.path.exists(logo_path):
            try:
                self.image(logo_path, 10, 8, 25)
            except Exception:
                pass

        self.set_xy(10, 10)
        self.set_font("Segoe", "B", 12)
        self.cell(0, 6, current_data["laboratorija"], ln=1)
        self.set_font("Segoe", "", 10)
        self.cell(0, 5, current_data["adresa1"], ln=1)
        self.cell(0, 5, current_data["adresa2"], ln=1)
        self.cell(0, 5, current_data["adresa3"], ln=1)
        self.ln(5)

    def footer(self):
        self._init_fonts()
        self.set_y(-15)
        self.set_font("Segoe", "", 8)
        self.cell(0, 5, "Rezultati analiza su kompjuterski štampani i važe bez potpisa i pečata.", 0, 1, "C")
        self.cell(0, 5, "1 / 1", 0, 0, "R")


def generate_pdf(output_name="MojLab_LabGuard_Generator.pdf"):
    pdf = MojLabPDF()
    pdf._init_fonts()
    pdf.add_page()

    pdf.set_font("Segoe", "B", 13)
    pdf.cell(0, 8, "Laboratorijski nalaz", ln=1, align="C")
    pdf.ln(3)

    # Patient and lab info table (rough layout)
    pdf.set_font("Segoe", "", 10)
    left_x = 10
    right_x = 110

    p = current_data["pacijent"]
    ni = current_data["nalaz_info"]

    pdf.set_xy(left_x, pdf.get_y())
    pdf.cell(40, 6, "Ime i prezime:", 0, 0)
    pdf.set_font("Segoe", "B", 10)
    pdf.cell(60, 6, p["ime"], 0, 0)
    pdf.set_font("Segoe", "", 10)
    pdf.set_xy(right_x, pdf.get_y())
    pdf.cell(30, 6, "Lab broj:", 0, 0)
    pdf.cell(60, 6, ni["lab_broj"], 0, 1)

    pdf.set_xy(left_x, pdf.get_y())
    pdf.cell(40, 6, "Datum rođenja:", 0, 0)
    pdf.cell(60, 6, p["datum_rodjenja"], 0, 0)
    pdf.set_xy(right_x, pdf.get_y())
    pdf.cell(30, 6, "Ljekar:", 0, 0)
    pdf.cell(60, 6, ni["ljekar"], 0, 1)

    pdf.set_xy(left_x, pdf.get_y())
    pdf.cell(40, 6, "Pol:", 0, 0)
    pdf.cell(60, 6, p["pol"], 0, 0)
    pdf.set_xy(right_x, pdf.get_y())
    pdf.cell(30, 6, "Vrijeme uzorkovanja:", 0, 0)
    pdf.cell(60, 6, ni["vrijeme_uzorkovanja"], 0, 1)

    pdf.ln(5)

    # Hematološke analize
    pdf.set_font("Segoe", "B", 11)
    pdf.cell(0, 7, "Hematološke analize", ln=1)

    # header row
    pdf.set_font("Segoe", "B", 9)
    col_w = [60, 25, 60, 25]  # Konstituent, Rezultat, Ref, Jedinica
    headers = ["Konstituent", "Rezultat", "Referentni interval", "Jedinica"]
    for w, h in zip(col_w, headers):
        pdf.cell(w, 6, h, border=1, align="L")
    pdf.ln()

    pdf.set_font("Segoe", "", 9)

    for name in ORDER_HEM:
        a = current_data["analiti"][name]
        pdf.cell(col_w[0], 6, name, border=1)
        pdf.cell(col_w[1], 6, str(a["value"]), border=1)
        pdf.cell(col_w[2], 6, a["ref"], border=1)
        pdf.cell(col_w[3], 6, a["unit"], border=1)
        pdf.ln()

    pdf.ln(5)
    pdf.set_font("Segoe", "B", 11)
    pdf.cell(0, 7, "Biohemijske analize 1", ln=1)

    pdf.set_font("Segoe", "B", 9)
    for w, h in zip(col_w, headers):
        pdf.cell(w, 6, h, border=1, align="L")
    pdf.ln()
    pdf.set_font("Segoe", "", 9)

    for name in ORDER_BIO:
        a = current_data["analiti"][name]
        pdf.cell(col_w[0], 6, name, border=1)
        pdf.cell(col_w[1], 6, str(a["value"]), border=1)
        pdf.cell(col_w[2], 6, a["ref"], border=1)
        pdf.cell(col_w[3], 6, a["unit"], border=1)
        pdf.ln()

    pdf.ln(15)
    pdf.set_font("Segoe", "", 9)
    pdf.cell(0, 5, "Napomena:", ln=1)
    pdf.ln(20)

    pdf.set_font("Segoe", "", 9)
    pdf.cell(0, 5, "Izvještaj kontrolisao:", 0, 0, "L")
    pdf.cell(0, 5, "Dr med. Gabdullina Elmira,", 0, 1, "R")
    pdf.cell(0, 5, "Specijalista kliničke biohemije", 0, 1, "R")
    pdf.ln(5)
    pdf.cell(0, 5, f"Datum izdavanja nalaza:   {current_data['nalaz_info']['datum_izdavanja']}", 0, 1, "R")

    pdf.output(output_name)


# --------------------------------------------------
# PARSIRANJE ORIGINALNOG PDF-A
# --------------------------------------------------

def load_from_pdf(path):
    global current_data
    text = ""

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""
            text += txt + "\n"

    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # Analiti
    for name in current_data["analiti"].keys():
        for line in lines:
            if line.startswith(name):
                rest = line[len(name):].strip()
                if not rest:
                    continue
                first = rest.split()[0]
                first = first.replace(",", ".")
                try:
                    val = float(first)
                    current_data["analiti"][name]["value"] = val
                except ValueError:
                    pass
                break

    # Datum izdavanja (ako nadjemo)
    for line in lines:
        if line.startswith("Datum izdavanja nalaza"):
            parts = line.split(":")
            if len(parts) > 1:
                datum_str = parts[1].strip()
                current_data["nalaz_info"]["datum_izdavanja"] = datum_str
            break


# --------------------------------------------------
# TKINTER GUI – tabela za edit više vrijednosti
# --------------------------------------------------

class LabGuardGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("LabGuard MojLab generator")
        self.entries = {}

        # Gornji toolbar
        toolbar = tk.Frame(root)
        toolbar.pack(fill="x", pady=5)

        btn_load = tk.Button(toolbar, text="Učitaj originalni PDF", command=self.on_load_pdf)
        btn_load.pack(side="left", padx=5)

        btn_reset = tk.Button(toolbar, text="Reset na template", command=self.reset_template)
        btn_reset.pack(side="left", padx=5)

        # Datum nalaza
        tk.Label(toolbar, text="Datum nalaza:").pack(side="left", padx=(20, 5))
        self.date_entry = DateEntry(toolbar, width=12, date_pattern="dd.mm.yyyy")
        self.date_entry.pack(side="left")

        # Scrollable frame za tabelu analita
        table_container = tk.Frame(root)
        table_container.pack(fill="both", expand=True, padx=10, pady=5)

        canvas = tk.Canvas(table_container)
        scrollbar = tk.Scrollbar(table_container, orient="vertical", command=canvas.yview)
        self.table_frame = tk.Frame(canvas)

        self.table_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=self.table_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Header tabele
        header = tk.Frame(self.table_frame)
        header.grid(row=0, column=0, sticky="w")
        tk.Label(header, text="Analit", width=30, anchor="w", font=("Arial", 9, "bold")).grid(row=0, column=0, padx=2, pady=2)
        tk.Label(header, text="Vrijednost", width=15, anchor="w", font=("Arial", 9, "bold")).grid(row=0, column=1, padx=2, pady=2)
        tk.Label(header, text="Ref. interval", width=18, anchor="w", font=("Arial", 9, "bold")).grid(row=0, column=2, padx=2, pady=2)
        tk.Label(header, text="Jedinica", width=12, anchor="w", font=("Arial", 9, "bold")).grid(row=0, column=3, padx=2, pady=2)

        self.populate_table()

        # Dugme za generisanje
        btn_gen = tk.Button(root, text="Generiši MojLab PDF", command=self.on_generate_pdf)
        btn_gen.pack(pady=8)

        # inicijalni datum
        self.date_entry.set_date(self._datum_to_datewidget(current_data["nalaz_info"]["datum_izdavanja"]))

    def _datum_to_datewidget(self, datum_str):
        from datetime import datetime, date
        datum_str = datum_str.strip().replace(".", "")
        try:
            d = datetime.strptime(datum_str, "%d.%m.%Y").date()
        except Exception:
            d = date.today()
        return d

    def populate_table(self):
        for widget in self.table_frame.grid_slaves():
            info = widget.grid_info()
            if int(info["row"]) > 0:
                widget.destroy()

        self.entries.clear()

        row = 1
        for name in ORDER_HEM:
            a = current_data["analiti"][name]
            self._add_row(row, name, a)
            row += 1

        row += 1
        tk.Label(self.table_frame, text="Biohemija", font=("Arial", 9, "bold")).grid(row=row, column=0, sticky="w", pady=(5, 2))
        row += 1

        for name in ORDER_BIO:
            a = current_data["analiti"][name]
            self._add_row(row, name, a)
            row += 1

    def _add_row(self, row, name, a):
        tk.Label(self.table_frame, text=name, width=30, anchor="w").grid(row=row, column=0, padx=2, pady=1, sticky="w")
        e = tk.Entry(self.table_frame, width=15)
        e.grid(row=row, column=1, padx=2, pady=1, sticky="w")
        e.insert(0, str(a["value"]))
        self.entries[name] = e

        tk.Label(self.table_frame, text=a["ref"], width=18, anchor="w").grid(row=row, column=2, padx=2, pady=1, sticky="w")
        tk.Label(self.table_frame, text=a["unit"], width=12, anchor="w").grid(row=row, column=3, padx=2, pady=1, sticky="w")

    def on_load_pdf(self):
        path = filedialog.askopenfilename(
            title="Odaberi originalni MojLab PDF",
            filetypes=[("PDF fajlovi", "*.pdf")]
        )
        if not path:
            return

        try:
            load_from_pdf(path)
            self.populate_table()
            self.date_entry.set_date(self._datum_to_datewidget(current_data["nalaz_info"]["datum_izdavanja"]))
            messagebox.showinfo("OK", "Podaci učitani iz PDF-a.")
        except Exception as e:
            messagebox.showerror("Greška", f"Nije uspjelo parsiranje PDF-a:\n{e}")

    def reset_template(self):
        global current_data
        current_data = deepcopy(TEMPLATE)
        self.populate_table()
        self.date_entry.set_date(self._datum_to_datewidget(current_data["nalaz_info"]["datum_izdavanja"]))

    def on_generate_pdf(self):
        for name, entry in self.entries.items():
            txt = entry.get().strip().replace(",", ".")
            if not txt:
                continue
            try:
                val = float(txt)
                current_data["analiti"][name]["value"] = val
            except ValueError:
                messagebox.showerror("Greška", f"Vrijednost za '{name}' mora biti broj.")
                return

        d = self.date_entry.get_date()
        current_data["nalaz_info"]["datum_izdavanja"] = d.strftime("%d.%m.%Y.")

        output_name = "MojLab_LabGuard_Generator.pdf"
        try:
            generate_pdf(output_name)
            messagebox.showinfo("OK", f"PDF generisan: {output_name}")
        except Exception as e:
            messagebox.showerror("Greška", f"Nije uspjelo generisanje PDF-a:\n{e}")


# --------------------------------------------------
# MAIN
# --------------------------------------------------

if __name__ == "__main__":
    root = tk.Tk()
    app = LabGuardGUI(root)
    root.geometry("720x520")
    root.mainloop()
