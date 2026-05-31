from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from facebook_publisher.db.session import get_db
from facebook_publisher.db.models import FbAccount, FbAccountStatus, Agent
from facebook_publisher.api.schemas import (
    AccountResponse,
    CreateAccountRequest,
    CreateAgentRequest,
)

router = APIRouter()


@router.get("", response_model=list[AccountResponse])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FbAccount).order_by(FbAccount.id))
    accounts = result.scalars().all()

    # Fetch agent names in bulk
    agent_ids = {a.agent_id for a in accounts if a.agent_id}
    agent_names: dict[int, str] = {}
    if agent_ids:
        ag_result = await db.execute(
            select(Agent.id, Agent.name).where(Agent.id.in_(agent_ids))
        )
        agent_names = {row[0]: row[1] for row in ag_result.all()}

    return [
        AccountResponse(
            id=a.id,
            fb_email=a.fb_email,
            fb_name=a.fb_name,
            status=a.status.value,
            daily_post_count=a.daily_post_count,
            daily_limit=a.daily_limit,
            cooldown_until=a.cooldown_until,
            last_post_at=a.last_post_at,
            active_hours_start=a.active_hours_start,
            active_hours_end=a.active_hours_end,
            agent_name=agent_names.get(a.agent_id) if a.agent_id else None,
        )
        for a in accounts
    ]


@router.post("", response_model=AccountResponse, status_code=201)
async def create_account(body: CreateAccountRequest, db: AsyncSession = Depends(get_db)):
    account = FbAccount(
        fb_email=body.fb_email,
        fb_name=body.fb_name,
        daily_limit=body.daily_limit,
        agent_id=body.agent_id,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return AccountResponse(
        id=account.id,
        fb_email=account.fb_email,
        fb_name=account.fb_name,
        status=account.status.value,
        daily_post_count=account.daily_post_count,
        daily_limit=account.daily_limit,
        cooldown_until=account.cooldown_until,
        last_post_at=account.last_post_at,
        active_hours_start=account.active_hours_start,
        active_hours_end=account.active_hours_end,
    )


@router.patch("/{account_id}/status")
async def update_account_status(
    account_id: int,
    status: str,
    db: AsyncSession = Depends(get_db),
):
    try:
        new_status = FbAccountStatus(status)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    result = await db.execute(select(FbAccount).where(FbAccount.id == account_id))
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    account.status = new_status
    if new_status == FbAccountStatus.active:
        account.cooldown_until = None
    account.updated_at = datetime.utcnow()
    await db.commit()
    return {"account_id": account_id, "status": new_status.value}


@router.post("/agents", status_code=201)
async def create_agent(body: CreateAgentRequest, db: AsyncSession = Depends(get_db)):
    agent = Agent(
        name=body.name,
        email=body.email,
        wasi_agent_id=body.wasi_agent_id,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return {"id": agent.id, "name": agent.name, "email": agent.email}
