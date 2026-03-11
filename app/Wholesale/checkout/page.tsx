
"use client";
import Script from "next/script"; // Add this import
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    MapPin, Loader2, ShieldCheck, Package, Building2, Store,
    Wallet, CheckCircle2, Info, ArrowLeft, Plus, AlertTriangle, ChevronRight
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function CheckoutPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [payLoading, setPayLoading] = useState(false);
    const [transportCharge, setTransportCharge] = useState(0);
    const [platformCharge, setPlatformCharge] = useState(80);
    const [handlingCharge, setHandlingCharge] = useState(150);
    // Data States
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [dbAddresses, setDbAddresses] = useState<any[]>([]);
    const [profileAddresses, setProfileAddresses] = useState<any[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>('reg');
    const [selectedAddressText, setSelectedAddressText] = useState<string>("");
    const [showAddressForm, setShowAddressForm] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        full_name: "", phone: "", street_address: "", city: "", state: "", pincode: ""
    });

    // Payment Logic
    const [totalWithGst, setTotalWithGst] = useState(0);
    const [subtotal, setSubtotal] = useState(0);
    const [advanceAmount, setAdvanceAmount] = useState(0);
    const minPercent = 0.15;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            if (!userStr) return router.push("/");

            const user = JSON.parse(userStr);

            // 1️⃣ LOAD PROFILE FIRST
            const { data: profile } = await supabase
                .from("wholesale_users")
                .select("*")
                .eq("id", user.id)
                .single();

            const transport = profile?.transport_charge || 0;
            setTransportCharge(transport);

            if (profile) {
                setProfileAddresses([
                    {
                        id: "reg",
                        type: "Registered Office",
                        addr: profile.registered_address,
                        icon: <Building2 size={16} />,
                    },
                    {
                        id: "shop",
                        type: "Shop/Warehouse",
                        addr: profile.shop_address,
                        icon: <Store size={16} />,
                    },
                ]);

                setSelectedAddressText(profile.registered_address);
            }

            // 2️⃣ LOAD CART
            const { data: cart } = await supabase
                .from("cart")
                .select(`
        id,
        quantity,
        product_variants(
          id,
          variant,
          unit,
          wholesale_price,
          products(
            name,
            brand,
            product_images(image_url)
          )
        )
      `)
                .eq("user_id", user.id);

            if (!cart || cart.length === 0) {
                router.push("/Wholesale/cart");
                return;
            }

            setCartItems(cart);

            // 3️⃣ CALCULATE TOTALS
            const calcSubtotal = cart.reduce(
                (acc: number, item: any) =>
                    acc + item.quantity * item.product_variants.wholesale_price,
                0
            );

            const gst = calcSubtotal * 0.18;

            const grandTotal =
                calcSubtotal +
                gst +
                transport +
                platformCharge +
                handlingCharge;

            setSubtotal(calcSubtotal);
            setTotalWithGst(grandTotal);
            setAdvanceAmount(Math.ceil(grandTotal * minPercent));

            // 4️⃣ LOAD EXTRA ADDRESSES
            const { data: addr } = await supabase
                .from("addresses")
                .select("*")
                .eq("user_id", user.id);

            setDbAddresses(addr || []);

        } catch (error) {
            console.error("Checkout load error:", error);
        } finally {
            setLoading(false);
        }
    };
    const handleAdvanceChange = (val: number) => {
        if (val > totalWithGst) {
            setAdvanceAmount(Math.floor(totalWithGst));
            toast.error("Cannot exceed total amount");
        } else {
            setAdvanceAmount(val);
        }
    };

    const minRequired = Math.ceil(totalWithGst * minPercent);
    const isAmountTooLow = advanceAmount < minRequired;
    const remainingBalance = totalWithGst - advanceAmount;

    if (loading) return (
        <div className="h-screen flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparing Secure Checkout...</p>
        </div>
    );

    const handlePayment = async () => {
        try {
            setPayLoading(true);

            // 1. Validation
            if (!selectedAddressId || !selectedAddressText) {
                toast.error("Please select a delivery address");
                setPayLoading(false);
                return;
            }

            const userStr = localStorage.getItem("wholesale_user");
            const user = JSON.parse(userStr || "{}");

            // 2. Generate Custom Order ID (JS-DDMMYYYY0001)
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

            // Fetch count for the current day to make ID sequential
            const { count } = await supabase
                .from("orders")
                .select('*', { count: 'exact', head: true });

            const customId = `JS-${dateStr}${String((count || 0) + 1).padStart(4, '0')}`;

            // 3. Format Items for JSONB storage
            const orderItemsSnapshot = cartItems.map(item => ({
                product_name: item.product_variants.products.name,
                variant_name: item.product_variants.variant,
                unit: item.product_variants.unit,
                quantity: item.quantity,
                price_at_purchase: item.product_variants.wholesale_price,
                subtotal: item.quantity * item.product_variants.wholesale_price,
                image: item.product_variants.products.product_images?.[0]?.image_url || null
            }));

            // 4. Prepare Order Data (Matching your SQL Schema)
            const orderData = {
                order_id_custom: customId,
                user_id: user.id,
                // If selectedAddressId is a valid UUID (not 'reg' or 'shop'), pass it, else null
                address_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedAddressId)
                    ? selectedAddressId
                    : null,
                address_snapshot: selectedAddressText,
                total_amount: parseFloat(totalWithGst.toFixed(2)),
                total_payable_amount: parseFloat(totalWithGst.toFixed(2)),
                amount_paid_now: parseFloat(advanceAmount.toFixed(2)),
                remaining_balance: parseFloat(remainingBalance.toFixed(2)),
                payment_type: advanceAmount >= totalWithGst ? 'full' : 'partial',
                payment_status: 'pending',
                order_status: 'processing',
                items: orderItemsSnapshot, // JSONB
                balance_due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            // 5. Insert Initial Order (Pending State)
            const { data: order, error: insertError } = await supabase
                .from("orders")
                .insert([orderData])
                .select()
                .single();

            if (insertError) throw insertError;

            // 6. Razorpay Configuration
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: Math.round(advanceAmount * 100), // Amount in paise
                currency: "INR",
                name: "JumboStar Wholesale",
                description: `Order ${customId}`,
                handler: async function (response: any) {
                    const paymentStatus = advanceAmount >= totalWithGst ? "paid" : "partially_paid";

                    // 1. Update Order Payment Details
                    const { error: updateError } = await supabase
                        .from("orders")
                        .update({
                            payment_id: response.razorpay_payment_id,
                            payment_status: paymentStatus
                        })
                        .eq("id", order.id);

                    if (updateError) {
                        console.error("Order Update Error:", updateError);
                        toast.error("Payment succeeded but order update failed.");
                        return;
                    }

                    // 2. REDUCE STOCK FOR EACH ITEM
                    try {
                        // We use Promise.all to run these updates efficiently
                        await Promise.all(cartItems.map(async (item) => {
                            const { error: stockError } = await supabase.rpc('reduce_stock', {
                                variant_id: item.product_variants.id,
                                qty_to_reduce: item.quantity
                            });

                            if (stockError) {
                                console.error(`Stock reduction failed for ${item.product_variants.id}:`, stockError);
                            }
                        }));
                    } catch (err) {
                        console.error("Critical Stock Update Error:", err);
                    }

                    // 3. SEND ORDER EMAIL
                    try {
                        await fetch("/api/send-order-email", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                email: user.email,
                                orderId: customId,
                                status: "Order Placed",
                                items: orderItemsSnapshot,
                                total: totalWithGst,
                                paid: advanceAmount,
                                remaining: remainingBalance,
                                address: selectedAddressText,
                            }),
                        });
                    } catch (emailErr) {
                        console.error("Email failed:", emailErr);
                    }

                    // 4. CLEAR CART
                    await supabase.from("cart").delete().eq("user_id", user.id);

                    // 5. FINALIZE
                    window.dispatchEvent(new Event("cartUpdated"));
                    toast.success("Order Placed Successfully!");
                    router.push("/Wholesale/orders");
                },
                prefill: {
                    name: user.full_name || "",
                    contact: user.phone || "",
                    email: user.email || ""
                },
                theme: { color: "#FF4F18" },
                modal: {
                    ondismiss: () => setPayLoading(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (err: any) {
            console.error("Checkout Process Error:", err);
            toast.error(err.message || "An unexpected error occurred during checkout.");
            setPayLoading(false);
        }
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddressSubmit = async () => {
        try {
            const userStr = localStorage.getItem("wholesale_user");
            const user = JSON.parse(userStr || "{}");

            if (!formData.full_name || !formData.phone || !formData.street_address || !formData.city) {
                toast.error("Please fill all required fields");
                return;
            }

            const { data, error } = await supabase
                .from("addresses")
                .insert([{
                    user_id: user.id,
                    ...formData
                }])
                .select()
                .single();

            if (error) throw error;

            toast.success("Address added!");
            setDbAddresses(prev => [...prev, data]);
            setSelectedAddressId(data.id);
            setSelectedAddressText(`${data.street_address}, ${data.city}`);
            setShowAddressForm(false);
            setFormData({ full_name: "", phone: "", street_address: "", city: "", state: "", pincode: "" });
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
            <Toaster position="top-right" />
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            {/* Editorial Header (Matching Cart Page) */}
            <div className="bg-white border-b border-slate-100 py-12 px-4 mb-10">
                <div className="max-w-7xl mx-auto">
                    <Link href="/Wholesale/cart" className="group flex items-center gap-2 text-slate-400 hover:text-red-600 transition-colors mb-6 text-[10px] font-black uppercase tracking-widest">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Cart
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-full">Secure Sourcing</span>
                                <span className="text-slate-300 text-sm font-bold">Step 2 of 2</span>
                            </div>
                            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Checkout</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* LEFT SIDE: DETAILS */}
                <div className="lg:col-span-8 space-y-8">

                    {/* 1. SHIPPING ADDRESS SECTION */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                                <MapPin size={18} className="text-red-600" /> Delivery Destination
                            </h3>
                            <button
                                onClick={() => setShowAddressForm(!showAddressForm)}
                                className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-4 py-2 rounded-xl hover:bg-red-100 transition-all"
                            >
                                {showAddressForm ? "Cancel" : "+ Custom Address"}
                            </button>
                        </div>

                        {showAddressForm ? (
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-4">Add New Location</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                        placeholder="Full Name"
                                        className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold"
                                    />
                                    <input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Phone"
                                        className="p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold"
                                    />
                                    <input
                                        name="city"
                                        value={formData.city}
                                        onChange={handleInputChange}
                                        placeholder="City"
                                        className="p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold"
                                    />
                                    <textarea
                                        name="street_address"
                                        value={formData.street_address}
                                        onChange={handleInputChange}
                                        placeholder="Full Street Address"
                                        className="col-span-2 p-4 bg-white rounded-2xl border border-slate-200 outline-none focus:border-red-600 text-xs font-bold h-20"
                                    />
                                    <button
                                        onClick={handleAddressSubmit}
                                        className="col-span-2 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
                                    >
                                        Save & Use Address
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[...profileAddresses, ...dbAddresses.map(a => ({
                                    id: a.id,
                                    type: 'Custom',
                                    addr: `${a.street_address}, ${a.city}`,
                                    icon: <MapPin size={16} />
                                }))].map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => { setSelectedAddressId(item.id); setSelectedAddressText(item.addr); }}
                                        className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex flex-col justify-between group ${selectedAddressId === item.id ? "border-red-600 bg-red-50/20" : "border-slate-50 bg-white hover:border-slate-200"}`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[9px] font-black uppercase text-red-600 flex items-center gap-1.5">{item.icon} {item.type}</span>
                                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedAddressId === item.id ? "border-red-600 bg-red-600 text-white" : "border-slate-200"}`}>
                                                {selectedAddressId === item.id && <CheckCircle2 size={12} />}
                                            </div>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed">{item.addr}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 2. ORDER MANIFEST (Matches Cart Page Items) */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item Breakdown</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Wholesale Value</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {cartItems.map((item, i) => {
                                const variant = item.product_variants;
                                const product = variant.products;
                                const img = product.product_images?.[0]?.image_url;
                                return (
                                    <div key={i} className="p-6 flex items-center justify-between group">
                                        <div className="flex gap-5 items-center">
                                            <div className="h-12 w-12 bg-slate-50 rounded-xl relative overflow-hidden border border-slate-100 flex-shrink-0">
                                                <Image src={img || "/placeholder.png"} alt="Product" fill className="object-contain p-1" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-900 uppercase text-xs mb-0.5">{product.name}</h4>
                                                <p className="text-[9px] text-slate-400 font-bold  tracking-tighter">Qty: {item.quantity}</p>
                                                <span className="font-black text-slate-900 text-sm">{variant.variant} - {variant.unit}  </span>
                                            </div>
                                        </div>
                                        <span className="font-black text-slate-900 text-sm">₹{(item.quantity * variant.wholesale_price).toLocaleString()}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: PREMIUM PAYMENT CARD */}
                <div className="lg:col-span-4">
                    <div className="bg-white rounded-[3rem] border border-slate-900 shadow-2xl overflow-hidden sticky top-28 transition-all">

                        {/* Summary Header */}
                        <div className="bg-slate-900 p-8 text-white">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck size={14} /> Verified Wholesale Order
                            </p>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Subtotal</div>
                                    <div className="text-sm font-black">₹{subtotal.toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Bulk GST (18%)</div>
                                    <div className="text-sm font-black">₹{(subtotal * 0.18).toLocaleString()}</div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Transport Charge</div>
                                    <div className="text-sm font-black">₹{transportCharge.toLocaleString()}</div>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Platform Fee</div>
                                    <div className="text-sm font-black">₹{platformCharge.toLocaleString()}</div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="text-xs font-bold text-slate-400 uppercase">Handling Charge</div>
                                    <div className="text-sm font-black">₹{handlingCharge.toLocaleString()}</div>
                                </div>
                                <div className="h-px bg-slate-800 my-4" />
                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] font-black text-white uppercase tracking-widest">Grand Total</div>
                                    <div className="text-3xl font-black tracking-tighter text-white">₹{totalWithGst.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Payment Section */}
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Set Advance Payment</label>
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-full ${isAmountTooLow ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                        MIN: ₹{minRequired.toLocaleString()}
                                    </span>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">₹</div>
                                    <input
                                        type="number"
                                        value={advanceAmount}
                                        onChange={(e) => handleAdvanceChange(Number(e.target.value))}
                                        className={`w-full bg-slate-50 border-2 rounded-[1.5rem] p-5 pl-10 text-2xl font-black outline-none transition-all ${isAmountTooLow ? 'border-red-200 text-red-600' : 'border-slate-100 text-slate-900 focus:border-red-600'}`}
                                    />
                                </div>
                                {isAmountTooLow && (
                                    <p className="text-[9px] font-black text-red-600 flex items-center gap-1 uppercase tracking-tighter">
                                        <AlertTriangle size={12} /> Minimum 15% is mandatory to reserve stock.
                                    </p>
                                )}
                            </div>

                            {/* Breakdown */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Remaining Due</span>
                                    <span className="font-black text-slate-900 text-sm">₹{remainingBalance.toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment} // <--- ADD THIS LINE
                                disabled={payLoading || isAmountTooLow || !selectedAddressId}
                                className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3 shadow-xl 
        ${isAmountTooLow
                                        ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                        : "bg-red-600 hover:bg-slate-900 text-white shadow-red-200 hover:scale-[1.02]"
                                    }`}
                            >
                                {payLoading ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : isAmountTooLow ? (
                                    "Insufficient Advance"
                                ) : (
                                    <>
                                        <Package size={18} /> Reserve & Pay Advance
                                    </>
                                )}
                            </button>

                            <div className="flex gap-3 items-start bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                <Info className="text-blue-600 shrink-0" size={16} />
                                <p className="text-[9px] font-bold text-blue-900 uppercase leading-relaxed tracking-tighter">
                                    Balance ₹{remainingBalance.toLocaleString()} must be cleared within 10 days to initiate logistics dispatch.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}