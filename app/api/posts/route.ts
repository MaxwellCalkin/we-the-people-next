import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/db";
import Post from "@/models/Post";
import cloudinary from "@/lib/cloudinary";

export async function GET() {
  try {
    await connectDB();

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "userName")
      .lean();

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const title = formData.get("title") as string;
    const caption = formData.get("caption") as string;
    const billSlug = formData.get("billSlug") as string;
    const billCongress = formData.get("billCongress") as string;
    const file = formData.get("file") as File;

    if (!title || !caption || !billSlug || !billCongress || !file) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Convert file to base64 data URI for Cloudinary upload
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const b64 = buffer.toString("base64");
    const dataURI = `data:${file.type};base64,${b64}`;

    const result = await cloudinary.uploader.upload(dataURI);

    const post = await Post.create({
      title,
      image: result.secure_url,
      billSlug,
      billCongress,
      cloudinaryId: result.public_id,
      caption,
      likes: 0,
      user: session.user.id,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
