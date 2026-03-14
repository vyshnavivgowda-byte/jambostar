"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trash2, Edit3, Eye, Plus, Landmark, X, Loader2, Save, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Bank {
    id: number;
    account_name: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
    qr_image: string | null;
}

export default function BankDetailsPage() {
    const [form, setForm] = useState({ account_name: "", bank_name: "", account_number: "", ifsc_code: "", upi_id: "" });
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchBanks(); }, []);

    async function fetchBanks() {
        setLoading(true);
        const { data, error } = await supabase.from("bank_details").select("*").order("created_at", { ascending: false });
        if (!error) setBanks(data || []);
        setLoading(false);
    }

    // VALIDATION LOGIC
    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!form.account_name.trim()) newErrors.account_name = "Name is required";
        if (!form.bank_name.trim()) newErrors.bank_name = "Bank name is required";

        // Account Number: Min 9, Max 18 digits usually
        if (!form.account_number.trim()) {
            newErrors.account_number = "Account number is required";
        } else if (!/^\d{9,18}$/.test(form.account_number)) {
            newErrors.account_number = "Enter a valid 9-18 digit number";
        }

        // IFSC Code: Standard Indian format (4 Alpha, 0, 6 Alpha/Num)
        if (!form.ifsc_code.trim()) {
            newErrors.ifsc_code = "IFSC is required";
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc_code.toUpperCase())) {
            newErrors.ifsc_code = "Invalid IFSC format (e.g. HDFC0001234)";
        }

        // QR Image: Required for new registrations
        if (!editingId && !qrFile) {
            newErrors.qr_image = "QR Code image is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadFile = async (file: File) => {
        const fileName = `${Date.now()}-${file.name.replace(/\s/g, "_")}`;
        const { data, error } = await supabase.storage.from("bank-qrs").upload(`qrs/${fileName}`, file);
        if (error) throw error;
        return supabase.storage.from("bank-qrs").getPublicUrl(data.path).data.publicUrl;
    };

    const handleEdit = (bank: Bank) => {
        setEditingId(bank.id);
        setForm({
            account_name: bank.account_name,
            bank_name: bank.bank_name,
            account_number: bank.account_number,
            ifsc_code: bank.ifsc_code,
            upi_id: bank.upi_id,
        });
        setPreviewUrl(bank.qr_image);
        setErrors({});
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return; // Stop if validation fails

        setIsSubmitting(true);
        try {
            let finalQrUrl = editingId ? banks.find(b => b.id === editingId)?.qr_image || null : null;
            if (qrFile) finalQrUrl = await uploadFile(qrFile);

            const payload = {
                ...form,
                ifsc_code: form.ifsc_code.toUpperCase(), // Normalize IFSC
                qr_image: finalQrUrl
            };

            if (editingId) {
                await supabase.from("bank_details").update(payload).eq("id", editingId);
            } else {
                await supabase.from("bank_details").insert([payload]);
            }

            resetForm();
            fetchBanks();
        } catch (err: any) {
            alert("System Error: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setForm({ account_name: "", bank_name: "", account_number: "", ifsc_code: "", upi_id: "" });
        setQrFile(null);
        setPreviewUrl(null);
        setEditingId(null);
        setErrors({});
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const generatePDF = async (bank: Bank) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // 1. BRANDED HEADER (JUMBO STAR)
        // Dark sleek header bar
        doc.setFillColor(15, 23, 42); // Slate 900
        doc.rect(0, 0, pageWidth, 20, "F");

        // Brand Name
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("JUMBO STAR", 15, 13);

        // Sub-header text
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("OFFICIAL PAYMENT MANDATE", 15, 17);

        // Date on right side of header
        doc.setFontSize(9);
        doc.text(`${new Date().toLocaleDateString()}`, pageWidth - 15, 13, { align: "right" });

        // 2. CENTERED QR SCANNER (Top Priority)
        if (bank.qr_image) {
            const img = new Image();
            img.src = bank.qr_image;
            img.crossOrigin = "anonymous";

            img.onload = () => {
                // Position QR below header
                const qrSize = 55;
                const xPos = (pageWidth - qrSize) / 2;

                // Add a subtle border/frame for the QR
                doc.setDrawColor(226, 232, 240); // Slate 200
                doc.rect(xPos - 2, 30 - 2, qrSize + 4, qrSize + 4);

                doc.addImage(img, "PNG", xPos, 30, qrSize, qrSize);

                // "Scan to Pay" Label
                doc.setFontSize(11);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(220, 38, 38); // Red 600
                doc.text("SCAN QR CODE TO INITIATE PAYMENT", pageWidth / 2, 95, { align: "center" });

                // 3. ACCOUNT DETAILS SECTION
                doc.setDrawColor(220, 38, 38);
                doc.setLineWidth(1);
                doc.line(15, 105, 30, 105); // Small accent line

                doc.setFontSize(13);
                doc.setTextColor(15, 23, 42);
                doc.text("BENEFICIARY DETAILS", 15, 112);

                // 4. THE TABLE (Professional Stripe Theme)
                const body = [
                    ["ACCOUNT HOLDER", bank.account_name.toUpperCase()],
                    ["BANK NAME", bank.bank_name.toUpperCase()],
                    ["ACCOUNT NUMBER", bank.account_number],
                    ["IFSC CODE", bank.ifsc_code.toUpperCase()],
                    ["UPI ID", bank.upi_id || "NOT PROVIDED"],
                ];

                autoTable(doc, {
                    startY: 118,
                    head: [["FIELD", "INFORMATION"]],
                    body: body,
                    theme: "striped",
                    headStyles: {
                        fillColor: [220, 38, 38], // Red Header
                        textColor: [255, 255, 255],
                        fontSize: 10,
                        fontStyle: "bold"
                    },
                    bodyStyles: {
                        fontSize: 11,
                        cellPadding: 5,
                        textColor: [30, 41, 59]
                    },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 50, textColor: [15, 23, 42] }
                    },
                    margin: { left: 15, right: 15 }
                });

                // 5. FOOTER & SECURITY NOTE
                const finalY = (doc as any).lastAutoTable.finalY + 15;

                doc.setFillColor(248, 250, 252); // Very light slate
                doc.rect(15, finalY, pageWidth - 30, 15, "F");

                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.setFont("helvetica", "");
                const note = "Note: Please verify the account holder name before confirming the transaction. This is a computer-generated document.";
                doc.text(note, pageWidth / 2, finalY + 9, { align: "center" });

                // Save PDF
                doc.save(`JUMBO_STAR_${bank.account_name.replace(/\s+/g, '_')}.pdf`);
            };

            img.onerror = () => {
                alert("Failed to load QR image for PDF. Please ensure the image URL is accessible.");
            };
        } else {
            // Fallback if no QR
            doc.setFontSize(12);
            doc.text("Error: QR Image missing for this record.", 15, 40);
            doc.save(`ERROR_PDF.pdf`);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-12 text-slate-900">
            <div className="max-w-8xl mx-auto space-y-8">

                <div className="flex justify-between items-end border-b-2 border-red-600 pb-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase">Bank <span className="text-red-600">Pro</span></h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Secure Record Management</p>
                    </div>
                    <Landmark size={40} className="text-red-600" />
                </div>

                {/* FORM SECTION */}
                <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-900 p-4 px-8 flex justify-between items-center">
                        <h2 className="text-white font-bold flex items-center gap-2 uppercase tracking-widest text-sm">
                            {editingId ? <Edit3 size={18} className="text-red-500" /> : <Plus size={18} className="text-red-500" />}
                            {editingId ? "Update Existing Record" : "Add New Account"}
                        </h2>
                        {editingId && <button onClick={resetForm} className="text-xs bg-red-600 text-white px-4 py-1 rounded-full font-black">CANCEL</button>}
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: "Account Holder", name: "account_name", type: "text", placeholder: "e.g. JUMBO STAR PVT LTD" },
                            { label: "Bank Name", name: "bank_name", type: "text", placeholder: "e.g. STATE BANK OF INDIA" },
                            { label: "Account Number", name: "account_number", type: "text", placeholder: "e.g. 0000123456789" },
                            { label: "IFSC Code", name: "ifsc_code", type: "text", placeholder: "e.g. SBIN0001234" },
                            { label: "UPI ID (Optional)", name: "upi_id", type: "text", placeholder: "e.g. jumbostar@okaxis" },
                        ].map((input) => (
                            <div key={input.name} className="flex flex-col gap-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                                    {input.label}
                                </label>
                                <input
                                    placeholder={input.placeholder} // Added this line
                                    value={(form as any)[input.name]}
                                    onChange={(e) => setForm({ ...form, [input.name]: e.target.value })}
                                    className={`p-3 bg-slate-50 border-2 rounded-xl outline-none font-bold transition-all placeholder:text-slate-300 placeholder:font-normal ${errors[input.name] ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-red-600'
                                        }`}
                                />
                                {errors[input.name] && (
                                    <span className="text-[9px] text-red-600 font-bold flex items-center gap-1 mt-1">
                                        <AlertCircle size={10} /> {errors[input.name]}
                                    </span>
                                )}
                            </div>
                        ))}

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black text-red-600 uppercase ml-1">QR Scanner Image</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                                    className={`text-xs w-full file:bg-slate-900 file:text-white file:border-0 file:rounded-lg file:px-3 file:py-2 ${errors.qr_image ? 'text-red-600' : ''
                                        }`}
                                />
                                {previewUrl && (
                                    <div className="w-12 h-12 border-2 border-red-600 rounded-lg overflow-hidden bg-slate-100 shadow-sm">
                                        <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                    </div>
                                )}
                            </div>
                            {errors.qr_image && <span className="text-[9px] text-red-600 font-bold mt-1">*{errors.qr_image}</span>}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="md:col-span-3 mt-4 bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg flex justify-center items-center gap-2 transition-all disabled:opacity-50 uppercase tracking-widest active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            {editingId ? "Update Record" : "Save the Record"}
                        </button>
                    </form>
                </section>

                {/* LIST SECTION */}
                <section className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-slate-800  uppercase tracking-wider">Bank Details</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b bg-slate-50/50">
                                    <th className="px-8 py-4">Account Holder</th>
                                    <th className="px-6 py-4">Bank Info</th>
                                    <th className="px-6 py-4 text-center">QR</th>
                                    <th className="px-8 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={4} className="p-20 text-center font-bold text-slate-300 animate-pulse uppercase">Synchronizing...</td></tr>
                                ) : banks.map((b) => (
                                    <tr key={b.id} className="hover:bg-red-50/40 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-black text-slate-900 text-lg uppercase leading-none">{b.account_name}</p>
                                            <p className="text-[10px] font-bold text-red-600 mt-1 uppercase ">{b.upi_id || "No UPI"}</p>
                                        </td>
                                        <td className="px-6 py-6 font-bold">
                                            <p className="text-slate-800 uppercase text-sm leading-none">{b.bank_name}</p>
                                            <p className="text-xs text-slate-400 font-mono mt-2">{b.account_number}</p>
                                        </td>
                                        <td className="px-6 py-6 text-center">
                                            <div className="flex justify-center">
                                                {b.qr_image ? (
                                                    <button onClick={() => window.open(b.qr_image!, "_blank")} className="w-12 h-12 rounded-xl border-2 border-red-600 overflow-hidden shadow-md">
                                                        <img src={b.qr_image} className="w-full h-full object-cover" />
                                                    </button>
                                                ) : <ImageIcon className="text-slate-200" size={24} />}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(b)} className="p-3 bg-slate-900 text-white hover:bg-red-600 rounded-xl shadow-md"><Edit3 size={16} /></button>
                                                <button onClick={() => generatePDF(b)} className="p-3 bg-slate-900 text-white hover:bg-red-600 rounded-xl shadow-md"><FileText size={16} /></button>
                                                <button onClick={() => { if (confirm("Delete?")) supabase.from("bank_details").delete().eq("id", b.id).then(() => fetchBanks()) }} className="p-3 bg-slate-900 text-white hover:bg-red-600 rounded-xl shadow-md"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}