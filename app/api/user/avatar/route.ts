// app/api/user/avatar/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/models/User";
import cloudinary from "@/lib/cloudinary";

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const b64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "avatars",
      transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }],
    });

    await User.findByIdAndUpdate(session.user.id, {
      avatar: result.secure_url,
    });

    return NextResponse.json({ avatar: result.secure_url });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return NextResponse.json(
      { error: "Failed to upload avatar" },
      { status: 500 }
    );
  }
}
