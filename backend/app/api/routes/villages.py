from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Village
from app.schemas.schemas import VillageCreate

router = APIRouter()


@router.get("/")
def list_villages(db: Session = Depends(get_db)):
    return db.query(Village).all()


@router.get("/{village_id}")
def get_village(village_id: int, db: Session = Depends(get_db)):
    village = db.query(Village).filter(
        Village.id == village_id
    ).first()

    if not village:
        raise HTTPException(
            status_code=404,
            detail="Village not found"
        )

    return village


@router.post("/")
def create_village(
    village: VillageCreate,
    db: Session = Depends(get_db)
):
    new_village = Village(
        name=village.name,
        district=village.district,
        state=village.state,
        population=village.population,
        latitude=village.latitude,
        longitude=village.longitude,
        water_source=village.water_source,
        reservoir_dependency=village.reservoir_dependency,
    )

    db.add(new_village)
    db.commit()
    db.refresh(new_village)

    return new_village


@router.delete("/{village_id}")
def delete_village(
    village_id: int,
    db: Session = Depends(get_db)
):
    village = db.query(Village).filter(
        Village.id == village_id
    ).first()

    if not village:
        raise HTTPException(
            status_code=404,
            detail="Village not found"
        )

    db.delete(village)
    db.commit()

    return {"message": "Village deleted successfully"}