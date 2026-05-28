import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from compiler import compile_proposal
from converter import html_to_latex

app = FastAPI(title="Proposal Generator")


class Sections(BaseModel):
    summary: str = ""
    problem: str = ""
    solution: str = ""
    investment: str = ""
    terms: str = ""


class ImageItem(BaseModel):
    data: str       # base64 data URL (may include "data:image/...;base64," prefix)
    name: str = "image"
    caption: str = ""
    mime_type: str = "image/jpeg"


class ProductItem(BaseModel):
    name: str = ""
    price: float = 0.0
    quantity: float = 1.0


class ProposalRequest(BaseModel):
    doctype: str = "Proposta Comercial"
    client_name: str = ""
    client_company: str = ""
    client_address: str = ""
    client_email: str = ""
    client_phone: str = ""
    proponent_name: str = "Grupo Acacia"
    proponent_contact: str = ""
    proponent_address: str = ""
    proponent_email: str = ""
    proponent_phone: str = ""
    proponent_website: str = ""
    proposal_ref: str = "PROP.2026/001"
    proposal_date: str = ""
    proposal_version: str = "ver. 1.0"
    currency: str = "€"
    partner_count: str = "0"
    partner_name: str = ""
    partner_contact: str = ""
    partner_address: str = ""
    partner_email: str = ""
    partner_phone: str = ""
    images: list[ImageItem] = []
    products: list[ProductItem] = []
    tax_rate: float = 0.0
    sections: Sections = Sections()


@app.post("/api/generate")
async def generate(req: ProposalRequest):
    try:
        content = {
            key: html_to_latex(getattr(req.sections, key))
            for key in ("summary", "problem", "solution", "investment", "terms")
        }
        pdf = await asyncio.to_thread(compile_proposal, req.model_dump(), content)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    filename = f"proposta-{req.proposal_ref}.pdf".replace("/", "-")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


app.mount(
    "/",
    StaticFiles(directory=str(Path(__file__).parent / "static"), html=True),
    name="static",
)
