import { NextResponse } from "next/server";
import {
  uploadFileToPinata,
  UploadConfigurationError,
  UploadProviderError,
} from "@/lib/pinata";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported in the MVP." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size must be 10 MB or less." }, { status: 400 });
    }

    const upload = await uploadFileToPinata(file);
    return NextResponse.json({ upload });
  } catch (cause) {
    if (cause instanceof UploadConfigurationError) {
      return NextResponse.json({ error: cause.message }, { status: 503 });
    }

    if (cause instanceof UploadProviderError) {
      return NextResponse.json({ error: cause.message }, { status: 502 });
    }

    return NextResponse.json({ error: "Unexpected upload failure." }, { status: 500 });
  }
}
