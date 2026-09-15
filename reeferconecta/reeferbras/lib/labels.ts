"use client";

import JsBarcode from "jsbarcode";
import QRCode from "qrcode";

// Gera a imagem do código de barras (Code39) e do QR Code para um QC, ambos como data URLs.
async function generateLabelAssets(qc: string) {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, qc.toUpperCase(), {
    format: "CODE39",
    displayValue: false,
    margin: 0,
    width: 2,
    height: 70,
  });
  const barcodeDataUrl = canvas.toDataURL("image/png");
  const qrDataUrl = await QRCode.toDataURL(qc, { margin: 1, width: 220 });
  return { qc, barcodeDataUrl, qrDataUrl };
}

// Monta e abre a janela de impressão com uma etiqueta de 100mm x 25mm por QC.
export async function printPieceLabels(qcs: string[]) {
  const validQcs = qcs.filter((qc) => qc.trim().length > 0);
  if (validQcs.length === 0) {
    throw new Error("Nenhum QC disponível para gerar etiqueta.");
  }

  const labels = await Promise.all(validQcs.map((qc) => generateLabelAssets(qc)));

  const labelsHtml = labels
    .map(
      ({ qc, barcodeDataUrl, qrDataUrl }) => `
        <div class="label">
          <div class="barcode-col">
            <img class="barcode" src="${barcodeDataUrl}" alt="Código de barras ${qc}" />
            <div class="qc-text">${qc}</div>
          </div>
          <img class="qr" src="${qrDataUrl}" alt="QR Code ${qc}" />
        </div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Etiquetas de peças</title>
        <style>
          @page { size: 100mm 25mm; margin: 0; }
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; }
          .label {
            width: 100mm;
            height: 25mm;
            padding: 2mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 2mm;
            overflow: hidden;
            page-break-after: always;
          }
          .label:last-child { page-break-after: auto; }
          .barcode-col {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .barcode { width: 100%; max-width: 68mm; height: 15mm; object-fit: contain; }
          .qc-text {
            margin-top: 1mm;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 8pt;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
          }
          .qr { width: 20mm; height: 20mm; flex-shrink: 0; }
        </style>
      </head>
      <body>${labelsHtml}</body>
    </html>`;

  const printWindow = window.open("", "_blank", "width=800,height=300");
  if (!printWindow) {
    throw new Error("Permita pop-ups para imprimir as etiquetas.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
  };
}
