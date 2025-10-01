package com.robogames.RoboCupMS.Repository;

import com.robogames.RoboCupMS.Entity.Discipline;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repozitar pro discipliny
 */
public interface DisciplineRepository extends JpaRepository<Discipline, Long> {

}
