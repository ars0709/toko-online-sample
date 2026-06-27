"use client";

import { useEffect } from "react";

/**
 * Full-screen API reference rendered with Scalar's standalone CDN build,
 * pointing at the generated OpenAPI document at /api/v1/openapi.json.
 */
export default function ApiDocsPage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <>
      <script
        id="api-reference"
        data-url="/api/v1/openapi.json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    </>
  );
}
