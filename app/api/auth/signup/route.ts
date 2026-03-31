import { NextRequest, NextResponse } from "next/server";
import validator from "validator";
import connectDB from "@/lib/db";
import User from "@/models/User";
import { lookupDistrict } from "@/lib/geocodio";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const { success } = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000); // 5 per hour
    if (!success) {
      return NextResponse.json(
        { success: false, errors: ["Too many signup attempts. Please try again later."] },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { userName, email, password, confirmPassword, zip, state: selectedState, cd: selectedCd } = body;

    // Validate inputs
    const errors: string[] = [];

    if (!userName || validator.isEmpty(userName.trim())) {
      errors.push("Username is required.");
    } else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(userName.trim())) {
      errors.push("Username must be 3-30 characters and contain only letters, numbers, hyphens, and underscores.");
    }
    if (!email || !validator.isEmail(email)) {
      errors.push("Please enter a valid email address.");
    }
    if (!password || password.length < 10) {
      errors.push("Password must be at least 10 characters long.");
    }
    if (password && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter.");
    }
    if (password && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number.");
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

    // Always look up congressional district via Geocodio to verify
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

    let state: string;
    let cd: string;

    if (selectedState && selectedCd) {
      // Client provided state/cd (split ZIP selection) — verify against Geocodio response
      const matchesDistrict = result.state === selectedState.toLowerCase() &&
        result.districts.some((d) => String(d.number) === String(selectedCd));

      if (!matchesDistrict) {
        return NextResponse.json(
          {
            success: false,
            errors: ["Invalid district selection for this ZIP code."],
          },
          { status: 400 }
        );
      }

      state = selectedState.toLowerCase();
      cd = String(selectedCd);
    } else if (result.districts.length > 1) {
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
    } else {
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
            "Could not create account. Please try a different email or username.",
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
