# Dental CRM - AI Agent Architecture

Este es un sistema de CRM dental avanzado con un agente de IA integrado para la gestión de citas y atención al paciente a través de WhatsApp.

## 🚀 Configuración Rápida

### 1. Requisitos Previos

- Node.js 18+
- Cuenta en Supabase (Base de datos y Auth)
- Cuenta de Desarrollador en Meta (WhatsApp Cloud API)
- API Keys de OpenAI o Gemini

### 2. Variables de Entorno

Este proyecto utiliza variables de entorno para gestionar claves de API y secretos. **Nunca** subas archivos `.env` al repositorio.

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env.local
   ```

2. Abre `.env.local` y rellena las claves con tus credenciales de Supabase, Meta y proveedores de IA.

### 3. Instalación e Inicio

```bash
npm install
npm run dev
```

## 🛡️ Seguridad y Privacidad

Para mantener el repositorio público seguro:

- **Archivos Ignorados**: El archivo `.gitignore` está configurado para excluir todos los archivos `.env*`.
- **Anonimización**: El código fuente utiliza exclusivamente `process.env` para acceder a secretos.
- **Validación de Webhooks**: Se utiliza `WHATSAPP_APP_SECRET` para firmar y validar todas las peticiones entrantes de Meta.

## 📁 Estructura del Proyecto

- `src/app`: Rutas de la aplicación (Next.js App Router).
- `src/components`: Componentes de UI reutilizables.
- `src/lib`: Clientes de API y lógica de servicios (Supabase, WhatsApp, Gemini).
- `scripts/`: Utilidades para migración y pruebas de base de datos.

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js, Tailwind CSS, Lucide React.
- **Backend**: Next.js API Routes, Supabase (PostgreSQL).
- **IA**: Google Gemini 2.0 / OpenAI GPT-4o.
- **Canales**: WhatsApp Cloud API.

---
Generado por **Antigravity Architect**.
