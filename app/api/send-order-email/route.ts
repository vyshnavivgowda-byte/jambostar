import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type OrderItem = {
  product_name: string;
  quantity: number;
  price_at_purchase: number;
};

type RequestBody = {
  email: string;
  orderId: string;
  status: string;
  items: OrderItem[];
  total: number;
  paid: number;
  remaining: number;
  address: string;
};

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();

    // Basic validation
    if (!body.email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "No items to send" }, { status: 400 });
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Build product table rows
    const itemsHtml = body.items
      .map(
        (item) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd">${item.product_name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right">₹${item.price_at_purchase}</td>
      </tr>
    `
      )
      .join("");

    // Build email HTML
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;padding:20px;line-height:1.5;color:#333">
        <h2 style="color:#FF4F18">Order Update</h2>

        <p>Your order <b>${body.orderId}</b> status has been updated to: <b>${body.status}</b></p>

        <h3>Delivery Address</h3>
        <p>${body.address}</p>

        <h3>Products Ordered</h3>
        <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
          <thead>
            <tr style="background:#f5f5f5">
              <th style="padding:8px;border:1px solid #ddd;text-align:left">Product</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:center">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <h3>Payment Summary</h3>
        <p><b>Total Amount:</b> ₹${body.total}</p>
        <p><b>Amount Paid:</b> ₹${body.paid}</p>
        <p><b>Remaining Balance:</b> ₹${body.remaining}</p>

        <p style="margin-top:30px;">Thank you for your business!</p>
      </div>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: body.email,
      subject: `Order Update - ${body.orderId}`,
      html: htmlContent,
    });

    console.log("Email sent:", info.messageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Order email error:", error);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }
}