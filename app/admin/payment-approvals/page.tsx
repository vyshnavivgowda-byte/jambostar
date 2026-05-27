"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import {
    CheckCircle, XCircle, Eye, Search,
    IndianRupee, ArrowUpDown, X, Loader2, FileText,
    Download // Added Download Icon
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "react-hot-toast";

export default function PaymentApprovalsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("pending");
    const [searchTerm, setSearchTerm] = useState("");
    const [dateSort, setDateSort] = useState("desc");

    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        fetchPayments();
    }, [filter, dateSort]);

    // NEW: Function to force download the image
    const downloadReceipt = async (url: string, orderId: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `Receipt-${orderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            toast.success("Download started");
        } catch (error) {
            toast.error("Download failed");
        }
    };

    const downloadPDF = async (payment: any) => {
        const toastId = toast.loading("Generating PDF...");

        try {
            // 1. Create a hidden container for the PDF content
            const element = document.createElement("div");
            element.style.padding = "40px";
            element.style.width = "800px";
            element.style.backgroundColor = "white";
            element.style.color = "#000";
            element.style.fontFamily = "sans-serif";

            // 2. Add Content HTML
            element.innerHTML = `
                <div style="border-bottom: 4px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="margin: 0; font-size: 28px; text-transform: uppercase;">Payment Audit Report</h1>
                    <p style="margin: 5px 0; color: #666; font-size: 12px; letter-spacing: 2px;">CONFIDENTIAL OFFICIAL RECORD</p>
                </div>

                <div style="display: flex; gap: 40px; margin-bottom: 40px;">
                    <div style="flex: 1;">
                        <h3 style="text-transform: uppercase; font-size: 14px; color: #94a3b8; margin-bottom: 10px;">Transaction Details</h3>
                        <p><strong>Order ID:</strong> #${payment.orders?.order_id_custom}</p>
                        <p><strong>Company:</strong> ${payment.orders?.wholesale_users?.company_name || "Direct"}</p>
                        <p><strong>Business ID:</strong> ${payment.orders?.wholesale_users?.business_id || "GUEST"}</p>
                        <p><strong>Amount:</strong> ₹${payment.payment_amount}</p>
                        <p><strong>Method:</strong> ${payment.payment_method}</p>
                        <p><strong>Reference:</strong> ${payment.bank_ref_number || payment.utr_number}</p>
                        <p><strong>Date:</strong> ${new Date(payment.created_at).toLocaleString()}</p>
                        <p><strong>Status:</strong> <span style="color: ${payment.payment_status === 'approved' ? 'green' : 'red'}; font-weight: bold;">${payment.payment_status.toUpperCase()}</span></p>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <h3 style="text-transform: uppercase; font-size: 14px; color: #94a3b8; margin-bottom: 15px;">Attachment: Payment Proof</h3>
                    <img src="${payment.payment_screenshot}" crossorigin="anonymous" style="width: 100%; max-height: 500px; object-fit: contain; border: 1px solid #e2e8f0; border-radius: 12px;" />
                </div>

                <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center;">
                    Generated on ${new Date().toLocaleString()} | Digital Audit Record
                </div>
            `;

            document.body.appendChild(element);

            // 3. Convert to Canvas and then PDF
            const canvas = await html2canvas(element, {
                useCORS: true, // Crucial for loading Supabase images
                scale: 2, // Higher quality
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Audit-${payment.orders?.order_id_custom}.pdf`);

            document.body.removeChild(element);
            toast.success("PDF Downloaded", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Could not generate PDF", { id: toastId });
        }
    };

    const fetchPayments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("payments")
            .select(`
        *,
        orders (
          order_id_custom,
          total_amount,
          wholesale_users (
            business_id,
            company_name
          )
        )
      `)
            .eq("payment_status", filter)
            .order("created_at", { ascending: dateSort === "asc" });

        if (error) {
            toast.error("Failed to load data");
        } else {
            setPayments(data || []);
        }
        setLoading(false);
    };

    const approvePayment = async (payment: any) => {
        const { error } = await supabase
            .from("payments")
            .update({
                payment_status: "approved",
                verified_at: new Date().toISOString(),
            })
            .eq("id", payment.id);

        if (error) {
            toast.error("Approval failed");
            return;
        }

        await supabase
            .from("orders")
            .update({ payment_status: "paid" })
            .eq("id", payment.order_id);

        toast.success("Payment Approved");
        fetchPayments();
    };

    const rejectPayment = async () => {
        if (!rejectReason) {
            toast.error("Reason required");
            return;
        }

        // 1️⃣ Get payment details
        const { data: payment } = await supabase
            .from("payments")
            .select("payment_amount, order_id")
            .eq("id", rejectId)
            .single();

        if (!payment) {
            toast.error("Payment not found");
            return;
        }

        // 2️⃣ Update payment status
        const { error } = await supabase
            .from("payments")
            .update({
                payment_status: "rejected",
                rejection_reason: rejectReason,
                verified_at: new Date().toISOString(),
            })
            .eq("id", rejectId);

        if (error) {
            toast.error("Rejection failed");
            return;
        }

        // 3️⃣ Reverse order ledger
        const { data: order } = await supabase
            .from("orders")
            .select("amount_paid_now, remaining_balance, total_amount")
            .eq("id", payment.order_id)
            .single();

        if (order) {
            const newPaid = Math.max(
                Number(order.amount_paid_now || 0) - Number(payment.payment_amount || 0),
                0
            );

            const newBalance = Number(order.total_amount) - newPaid;

            await supabase
                .from("orders")
                .update({
                    amount_paid_now: newPaid,
                    remaining_balance: newBalance,
                    payment_status: newPaid === 0 ? "unpaid" : "partial",
                })
                .eq("id", payment.order_id);
        }

        toast.success("Payment Rejected");

        setRejectId(null);
        setRejectReason("");

        fetchPayments();
    };

    const filteredPayments = payments.filter(p =>
        p.orders?.order_id_custom?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#F9FAFB] text-slate-900 font-sans">
            {/* HEADER SECTION */}
            <div className="bg-white border-b sticky top-0 z-30 px-6 py-5">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase">
                            Financial <span className="text-red-600">Audit</span>
                        </h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Manual Payment Verification Portal</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search Order ID..."
                                className="pl-12 pr-6 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-slate-200 outline-none w-72 transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setDateSort(dateSort === "desc" ? "asc" : "desc")}
                            className="flex items-center gap-2 bg-white border-2 border-slate-100 px-5 py-3 rounded-2xl text-[11px] font-black uppercase hover:bg-slate-50 transition-colors"
                        >
                            <ArrowUpDown size={16} /> {dateSort === "desc" ? "Latest First" : "Earliest First"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-8xl mx-auto p-6 md:p-8">
                {/* TAB FILTERS */}
                <div className="flex gap-2 mb-10 bg-slate-200/50 p-1.5 rounded-[1.2rem] w-fit">
                    {["pending", "approved", "rejected"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-8 py-3 rounded-[1rem] text-[11px] font-black uppercase tracking-widest transition-all
                ${filter === f ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* DATA LIST */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Accessing Secure Ledger...</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {filteredPayments.map((payment) => (
                            <div key={payment.id} className="bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all flex flex-col md:flex-row items-center gap-8">

                                {/* Image Column with Dual Actions */}
                                <div className="relative group w-24 h-24 shrink-0">
                                    <Image
                                        src={payment.payment_screenshot || "/placeholder-img.png"}
                                        alt="Proof"
                                        fill
                                        className="object-cover rounded-[1.5rem] border-2 border-slate-50 shadow-inner"
                                    />
                                    {/* Action Overlay */}
                                    <div className="absolute inset-0 bg-slate-900/70 rounded-[1.5rem] opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-300">
                                        <button
                                            onClick={() => setPreviewImage(payment.payment_screenshot)}
                                            className="p-2 bg-white/10 hover:bg-white/30 text-white rounded-full transition-colors"
                                            title="View Image"
                                        >
                                            <Eye size={20} />
                                        </button>
                                        <button
                                            onClick={() => downloadReceipt(payment.payment_screenshot, payment.orders?.order_id_custom)}
                                            className="p-2 bg-white/10 hover:bg-white/30 text-white rounded-full transition-colors"
                                            title="Download Image"
                                        >
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Info Columns */}
                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                                    <div className="space-y-1">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Business Source</span>
                                        <p className="text-sm font-black text-slate-900 leading-tight">{payment.orders?.wholesale_users?.company_name || "Direct Order"}</p>
                                        <p className="text-xs font-bold text-red-600 bg-red-50 w-fit px-2 py-0.5 rounded-md">{payment.orders?.wholesale_users?.business_id || "GUEST"}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Reference</span>
                                        <p className="text-sm font-black text-slate-900 tracking-tight">#{payment.orders?.order_id_custom}</p>
                                        <p className="text-xs font-mono font-bold text-slate-500 bg-slate-50 p-1 rounded-lg border border-slate-100 truncate max-w-[140px]">
                                            {payment.bank_ref_number || payment.utr_number || "NO_REF"}
                                        </p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Total Amount</span>
                                        <div className="flex items-center gap-0.5 text-base font-black text-slate-900">
                                            <IndianRupee size={16} strokeWidth={3} />
                                            <span>{payment.payment_amount?.toLocaleString()}</span>
                                        </div>
                                        <p className="text-[11px] font-black text-green-600 uppercase tracking-tighter">{payment.payment_method}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">Timestamp</span>
                                        <p className="text-sm font-bold text-slate-700 ">
                                            {new Date(payment.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400">{new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                                    {filter === "pending" ? (
                                        <>
                                            <button
                                                onClick={() => downloadPDF(payment)}
                                                className="p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                                                title="Download Audit PDF"
                                            >
                                                <Download size={24} />
                                            </button>
                                            <button
                                                onClick={() => setRejectId(payment.id)}
                                                className="flex-1 md:flex-none p-4 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all group"
                                            >
                                                <XCircle size={28} className="group-active:scale-90 transition-transform" />
                                            </button>
                                            <button
                                                onClick={() => approvePayment(payment)}
                                                className="flex-1 md:flex-none bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] hover:bg-green-600 transition-all shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2"
                                            >
                                                <CheckCircle size={18} /> Approve
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase border-2 shadow-sm ${filter === "approved" ? "border-green-100 text-green-600 bg-green-50" : "border-red-100 text-red-600 bg-red-50"}`}>
                                                {filter}
                                            </div>

                                            {/* NEW: Display Rejection Reason if it exists and filter is 'rejected' */}
                                            {filter === "rejected" && payment.rejection_reason && (
                                                <div className="max-w-[200px] bg-red-50 border-l-4 border-red-500 p-3 rounded-r-xl">
                                                    <span className="text-[9px] font-black text-red-400 uppercase block mb-1">Reason:</span>
                                                    <p className="text-xs font-bold text-red-700  leading-tight">
                                                        "{payment.rejection_reason}"
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* REJECT MODAL */}
            {rejectId && (
                <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
                        <h2 className="text-2xl font-black uppercase  mb-2 tracking-tight">Reject <span className="text-red-600">Verification</span></h2>
                        <p className="text-slate-400 text-[11px] font-black uppercase mb-8 tracking-[0.2em]">Transaction protocol failure reason</p>
                        <textarea
                            placeholder="Enter rejection details for the wholesale user..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] p-6 text-sm font-bold text-slate-700 focus:border-red-600 focus:bg-white outline-none transition-all h-40 resize-none shadow-inner"
                        />
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setRejectId(null)} className="flex-1 py-5 font-black uppercase text-[11px] text-slate-400 hover:text-slate-600 transition-colors">Abort</button>
                            <button onClick={rejectPayment} className="flex-[2] bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95">Finalize Rejection</button>
                        </div>
                    </div>
                </div>
            )}

            {/* IMAGE PREVIEW MODAL */}
            {previewImage && (
                <div className="fixed inset-0 bg-slate-950/95 z-[60] flex flex-col items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-300">
                    <button onClick={() => setPreviewImage(null)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-all hover:rotate-90">
                        <X size={48} />
                    </button>
                    <div className="relative w-full max-w-5xl h-[85vh] shadow-2xl">
                        <Image src={previewImage} alt="Fullscreen Proof" fill className="object-contain rounded-lg" />
                    </div>
                    <p className="text-white/40 font-black uppercase text-[10px] tracking-[0.5em] mt-6">Audit View Mode</p>
                </div>
            )}
        </div>
    );
}