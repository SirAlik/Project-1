import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function generateLRCCertificate(studentName: string) {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    // Create a temporary div for the certificate design
    const certDiv = document.createElement("div");
    certDiv.style.width = "1123px"; // A4 Landscape ratio
    certDiv.style.height = "794px";
    certDiv.style.padding = "40px";
    certDiv.style.background = "linear-gradient(135deg, #FFFFFF 0%, #FBF7EF 100%)";
    certDiv.style.color = "#111827";
    certDiv.style.fontFamily = "sans-serif";
    certDiv.style.display = "flex";
    certDiv.style.flexDirection = "column";
    certDiv.style.alignItems = "center";
    certDiv.style.justifyContent = "center";
    certDiv.style.border = "15px solid #0D9488";
    certDiv.style.position = "absolute";
    certDiv.style.left = "-9999px";
    certDiv.style.direction = "rtl";

    certDiv.innerHTML = `
        <div style="text-align: center;">
            <h1 style="font-size: 60px; color: #0D9488; margin-bottom: 20px;">شهادة تميـز</h1>
            <p style="font-size: 24px; color: #6B7280; margin-bottom: 40px;">يتقدم مركز مصادر التعلم بخالص الشكر والتقدير للطالب:</p>
            <h2 style="font-size: 80px; color: #111827; margin-bottom: 20px; border-bottom: 2px solid #E8E1D4; padding-bottom: 10px;">${studentName}</h2>
            <p style="font-size: 24px; color: #6B7280; margin-top: 40px;">كأكثر الطلاب استعارة وتفاعلاً مع المكتبة لهذا الشهر</p>
            <div style="margin-top: 60px; display: flex; justify-content: space-around; width: 100%;">
                <div style="text-align: center;">
                    <div style="width: 150px; border-bottom: 2px solid #0D9488;"></div>
                    <p style="margin-top: 10px; color: #0D9488;">أمين مصادر التعلم</p>
                </div>
                <div style="text-align: center;">
                    <div style="width: 150px; border-bottom: 2px solid #0D9488;"></div>
                    <p style="margin-top: 10px; color: #0D9488;">ختم المدرسة</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(certDiv);

    try {
        const canvas = await html2canvas(certDiv, {
            scale: 2,
            backgroundColor: "#FBF7EF",
        });
        const imgData = canvas.toDataURL("image/png");
        doc.addImage(imgData, "PNG", 0, 0, 297, 210);
        doc.save(`شهادة_المكتبة_${studentName}.pdf`);
    } catch (error) {
        console.error("Certificate generation failed", error);
    } finally {
        document.body.removeChild(certDiv);
    }
}
