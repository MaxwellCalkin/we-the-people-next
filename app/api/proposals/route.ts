import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { listProposals, createProposal } from "@/lib/proposals";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") as "global" | "state" | "district") || "global";
    const result = await listProposals({
      scope,
      state: searchParams.get("state") || undefined,
      district: searchParams.get("district") || undefined,
      sort: (searchParams.get("sort") as "top" | "new") || "top",
      page: Number(searchParams.get("page")) || 1,
      limit: Number(searchParams.get("limit")) || 30,
      viewerId: session?.user?.id,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("Error listing proposals:", e);
    return NextResponse.json({ error: "Failed to fetch proposals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const title = (form.get("title") as string)?.trim();
    const description = (form.get("description") as string)?.trim();
    const file = form.get("file") as File | null;
    if (!title || !description) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }

    let image: string | undefined, cloudinaryId: string | undefined;
    if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const res = await cloudinary.uploader.upload(`data:${file.type};base64,${b64}`);
      image = res.secure_url;
      cloudinaryId = res.public_id;
    }

    const proposal = await createProposal({
      title,
      description,
      image,
      cloudinaryId,
      author: { id: session.user.id, state: session.user.state, cd: session.user.cd },
    });
    return NextResponse.json({ proposal: { _id: String(proposal._id) } }, { status: 201 });
  } catch (e) {
    console.error("Error creating proposal:", e);
    return NextResponse.json({ error: "Failed to create proposal" }, { status: 500 });
  }
}
