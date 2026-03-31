import { NextRequest, NextResponse } from "next/server";
import validator from "validator";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { lookupDistrict } from "@/lib/geocodio";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userName, email, password, confirmPassword, zip, state: selectedState, cd: selectedCd } = body;

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
    if (!zip || !/^\d{5}$/.test(zip)) {
      errors.push("Please enter a valid 5-digit ZIP code.");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }

    // If state and cd were provided (user already selected from split ZIP), use those
    let state = selectedState;
    let cd = selectedCd;

    if (!state || !cd) {
      // Look up congressional district via Geocodio
      const result = await lookupDistrict(zip);

      if (!result) {
        return NextResponse.json(
          {
            success: false,
            errors: [
              "Could not find your congressional district. Please check your ZIP code.",
            ],
          },
          { status: 400 }
        );
      }

      if (result.districts.length > 1) {
        // Split ZIP — return districts for user to pick
        return NextResponse.json(
          {
            success: false,
            needsDistrictSelection: true,
            state: result.state,
            districts: result.districts,
          },
          { status: 200 }
        );
      }

      // Single district
      state = result.state;
      cd = String(result.districts[0].number);
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
