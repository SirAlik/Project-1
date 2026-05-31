import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportToOfficialPDF(elementId: string, fileName: string, qualityCode: string) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Temporarily apply official styles for export
    const originalStyle = element.style.cssText;
    element.style.padding = "20px";
    element.style.backgroundColor = "white";
    element.style.color = "black";
    element.style.width = "800px"; // Fixed width for consistent PDF output

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        // Add background border/frame if needed or official header can be part of the HTML
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

        // Add Quality Code at the bottom right
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(qualityCode, pdfWidth - 25, pdfHeight - 10, { align: "right" });

        pdf.save(`${fileName}.pdf`);
    } catch (error) {
        console.error("PDF Export failed:", error);
    } finally {
        element.style.cssText = originalStyle;
    }
}
