// api/index.ts
import { VercelRequest, VercelResponse } from "@vercel/node";
import app from "../src/server";

export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
