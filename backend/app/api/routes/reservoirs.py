from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Reservoir
from app.schemas.schemas import ReservoirCreate

router = APIRouter()


@router.get("/")
def list_reservoirs(db: Session = Depends(get_db)):
    return db.query(Reservoir).all()


@router.get("/{reservoir_id}")
def get_reservoir(
    reservoir_id: int,
    db: Session = Depends(get_db)
):
    reservoir = db.query(Reservoir).filter(
        Reservoir.id == reservoir_id
    ).first()

    if not reservoir:
        raise HTTPException(
            status_code=404,
            detail="Reservoir not found"
        )

    return reservoir


@router.post("/")
def create_reservoir(
    reservoir: ReservoirCreate,
    db: Session = Depends(get_db)
):
    new_reservoir = Reservoir(
        name=reservoir.name,
        capacity=reservoir.capacity,
        current_level=reservoir.current_level,
        district=reservoir.district,
        state=reservoir.state,
        latitude=reservoir.latitude,
        longitude=reservoir.longitude,
    )

    db.add(new_reservoir)
    db.commit()
    db.refresh(new_reservoir)

    return new_reservoir


@router.delete("/{reservoir_id}")
def delete_reservoir(
    reservoir_id: int,
    db: Session = Depends(get_db)
):
    reservoir = db.query(Reservoir).filter(
        Reservoir.id == reservoir_id
    ).first()

    if not reservoir:
        raise HTTPException(
            status_code=404,
            detail="Reservoir not found"
        )

    db.delete(reservoir)
    db.commit()

    return {
        "message": "Reservoir deleted successfully"
    }