import { NextRequest, NextResponse } from "next/server";
import validator from "validator";
import connectDB from "@/lib/db";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userName, email, password, confirmPassword, address } = body;

    // Validate inputs
    const errors: string[] = [];

    if (!userName || validator.isEmpty(userName.trim())) {
      errors.push("Username is required.");
    }
    if (!email || !validator.isEmail(email)) {
      errors.push("Please enter a valid email address.");
    }
    if (!password || !validator.isLength(password, { min: 8 })) {
      errors.push("Password must be at least 8 characters long.");
    }
    if (password !== confirmPassword) {
      errors.push("Passwords do not match.");
    }
    if (!address || validator.isEmpty(address.trim())) {
      errors.push("Address is required to find your representatives.");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // Look up congressional district via Google Civic divisionsByAddress API
    const civicResp = await fetch(
      `https://civicinfo.googleapis.com/civicinfo/v2/divisionsByAddress?address=${encodeURIComponent(
        address
      )}&key=${process.env.GOOGLE_KEY}`,
      { method: "GET" }
    );
    const civicData = await civicResp.json();

    if (!civicData.divisions) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            "Could not find your congressional district. Try a more specific address (include city, state, and zip).",
          ],
        },
        { status: 400 }
      );
    }

    // Parse OCD-IDs to find state and congressional district
    const divisionIds = Object.keys(civicData.divisions);
    let state = "";
    let cd = "1"; // Default to at-large

    // Find the state from any division ID containing "state:"
    for (const id of divisionIds) {
      const stateMatch = id.match(/state:([a-z]{2})/);
      if (stateMatch) {
        state = stateMatch[1];
        break;
      }
    }

    // Find the congressional district (cd:XX)
    for (const id of divisionIds) {
      const cdMatch = id.match(/\/cd:(\d+)/);
      if (cdMatch) {
        cd = cdMatch[1];
        break;
      }
    }

    if (!state) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            "Could not determine your state. Please try a different address.",
          ],
        },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = validator.normalizeEmail(email, {
      gmail_remove_dots: false,
    });

    if (!normalizedEmail) {
      return NextResponse.json(
        { success: false, errors: ["Invalid email address."] },
        { status: 400 }
      );
    }

    // Connect to DB and check for existing user
    await connectDB();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { userName }],
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            "Account with that email address or username already exists.",
          ],
        },
        { status: 409 }
      );
    }

    // Create new user
    const user = await User.create({
      userName,
      email: normalizedEmail,
      password,
      state,
      cd,
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          userName: user.userName,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json(
      {
        success: false,
        errors: ["Something went wrong during signup. Please try again."],
      },
      { status: 500 }
    );
  }
}
