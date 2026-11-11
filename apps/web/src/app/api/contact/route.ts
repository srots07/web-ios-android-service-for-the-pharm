import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.API_BASE_URL || "http://127.0.0.1:8000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      country,
      organization,
      enquiryType,
      subject,
      message,
      consent,
    } = body;

    // Strict validation
    const errors: Record<string, string> = {};

    if (!fullName || typeof fullName !== "string" || fullName.trim().length < 2) {
      errors.fullName = "Full name is required (minimum 2 characters).";
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "A valid business email address is required.";
    }

    if (!country || typeof country !== "string" || country.trim().length === 0) {
      errors.country = "Country / Operating Region is required.";
    }

    if (!subject || typeof subject !== "string" || subject.trim().length < 3) {
      errors.subject = "Subject is required (minimum 3 characters).";
    }

    if (!message || typeof message !== "string" || message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters detailing your inquiry.";
    }

    if (!consent) {
      errors.consent = "You must acknowledge data privacy and consent terms.";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed. Please correct the highlighted fields.", errors },
        { status: 400 }
      );
    }

    // Generate unique inquiry reference code
    const referenceId = `PRIME-INQ-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    // Persist directly to FastAPI database endpoint
    const backendRes = await fetch(`${FASTAPI_URL}/api/v1/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceId,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : null,
        country: country.trim(),
        organization: organization ? organization.trim() : null,
        enquiryType: enquiryType || "General Enquiry",
        subject: subject.trim(),
        message: message.trim(),
      }),
      cache: "no-store",
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.detail || "Database failed to persist commercial inquiry." },
        { status: backendRes.status }
      );
    }

    const backendData = await backendRes.json();

    return NextResponse.json({
      success: true,
      referenceId: backendData.referenceId || referenceId,
      timestamp,
      message: "Your inquiry has been successfully logged with our corporate partnerships desk.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unable to reach core inquiry service. Please try again shortly." },
      { status: 502 }
    );
  }
}
