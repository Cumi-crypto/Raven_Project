package App;

import java.util.List;

/**
 * Repository<T> — Generic interface for data access objects (DAOs).
 * Demonstrates abstraction and generics in OOP design.
 * Implemented by: UserRepository, AchievementRepository
 */
public interface Repository<T> {

    /**
     * Save (insert or update) an entity.
     * @param item The entity to save
     */
    void save(T item);

    /**
     * Find an entity by its integer ID.
     * @param id The primary key
     * @return The entity, or null if not found
     */
    T findById(int id);

    /**
     * Retrieve all entities.
     * @return A list of all entities in the data store
     */
    List<T> findAll();

    /**
     * Delete an entity by ID.
     * @param id The primary key of the entity to delete
     */
    void deleteById(int id);
}
