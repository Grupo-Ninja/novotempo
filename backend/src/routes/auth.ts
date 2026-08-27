import { Router } from "express";
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/login", async (req, res) => {
  const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  console.log(`Recebido pedido de login para: ${email}`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.warn(`Login falhou: Usuário ${email} não encontrado.`);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.warn(`Login falhou: Senha incorreta para ${email}.`);
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    console.log(`Login bem-sucedido para: ${email}`);
    // Return user info (excluding password)
    const { password: _, ...userInfo } = user;
    res.json(userInfo);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


export default router;
